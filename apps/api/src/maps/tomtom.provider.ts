import { Logger } from '@nestjs/common';
import type {
  GeocodeResult,
  GeoPoint,
  MapsProvider,
  RouteResult,
} from '@wash-and-go/maps';

// Injectable fetch so specs can drive the adapter without real HTTP.
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/*
 * TomTom adapter (D10 spike vendor). Uses the products the dev key has enabled:
 *  - Search API  → forward geocode via the fuzzy /search endpoint
 *  - Routing API → one-way driving distance/time
 * Reverse geocode uses the /reverseGeocode endpoint (Reverse Geocoding API);
 * if that product isn't enabled it 403s, which we degrade to null rather than
 * throw. Geocode failures also degrade to null so a booking never hard-fails on
 * a maps outage; route() throws (the caller needs a distance to price).
 */
// Build a short, human label from a Nominatim reverse result: street (with
// house number if present), barangay/suburb, city — skipping blanks and dupes.
// Falls back to the full display_name if we can't assemble parts.
function shortLabel(body: {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}): string | undefined {
  const a = body.address ?? {};
  const street = [a.house_number, a.road ?? body.name].filter(Boolean).join(' ');
  const area = a.neighbourhood ?? a.suburb ?? a.village ?? a.quarter;
  const city = a.city ?? a.town ?? a.municipality ?? a.county;
  const parts = [street || body.name, area, city].filter(
    (p): p is string => !!p,
  );
  const seen = new Set<string>();
  const label = parts.filter((p) => !seen.has(p) && seen.add(p)).join(', ');
  return label || body.display_name || undefined;
}

export class TomTomProvider implements MapsProvider {
  readonly name = 'tomtom';
  private readonly logger = new Logger('TomTomProvider');
  private readonly base = 'https://api.tomtom.com';

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = (url, init) => fetch(url, init),
  ) {}

  async geocode(query: string): Promise<GeocodeResult | null> {
    const url =
      `${this.base}/search/2/search/${encodeURIComponent(query)}.json` +
      `?key=${this.apiKey}&countrySet=PH&limit=1`;
    try {
      const res = await this.fetchFn(url);
      if (!res.ok) return this.warnNull('geocode', res.status, query);
      const body = (await res.json()) as {
        results?: {
          position?: { lat: number; lon: number };
          address?: { freeformAddress?: string };
          score?: number;
        }[];
      };
      const r = body.results?.[0];
      if (!r?.position) return null;
      return {
        point: { lat: r.position.lat, lng: r.position.lon },
        label: r.address?.freeformAddress ?? query,
        score: r.score,
      };
    } catch (e) {
      this.logger.warn(`geocode error for "${query}": ${String(e)}`);
      return null;
    }
  }

  async search(query: string, limit = 5): Promise<GeocodeResult[]> {
    // Same fuzzy-search product as geocode(), but keep every candidate for a
    // typeahead. countrySet=PH + a Zamboanga lat/lon bias rank local hits first.
    const capped = Math.min(Math.max(limit, 1), 10);
    const url =
      `${this.base}/search/2/search/${encodeURIComponent(query)}.json` +
      `?key=${this.apiKey}&countrySet=PH&limit=${capped}` +
      `&lat=6.9214&lon=122.0790`;
    try {
      const res = await this.fetchFn(url);
      if (!res.ok) {
        this.warnNull('search', res.status, query);
        return [];
      }
      const body = (await res.json()) as {
        results?: {
          position?: { lat: number; lon: number };
          address?: { freeformAddress?: string };
          score?: number;
        }[];
      };
      return (body.results ?? [])
        .filter((r) => r.position)
        .map((r) => ({
          point: { lat: r.position!.lat, lng: r.position!.lon },
          label: r.address?.freeformAddress ?? query,
          score: r.score,
        }));
    } catch (e) {
      this.logger.warn(`search error for "${query}": ${String(e)}`);
      return [];
    }
  }

  async reverseGeocode(point: GeoPoint): Promise<string | null> {
    const url =
      `${this.base}/search/2/reverseGeocode/${point.lat},${point.lng}.json` +
      `?key=${this.apiKey}`;
    try {
      const res = await this.fetchFn(url);
      if (res.ok) {
        const body = (await res.json()) as {
          addresses?: { address?: { freeformAddress?: string } }[];
        };
        const label = body.addresses?.[0]?.address?.freeformAddress;
        if (label) return label;
      } else {
        this.warnNull('reverseGeocode', res.status);
      }
    } catch (e) {
      this.logger.warn(`reverseGeocode error: ${String(e)}`);
    }
    // Fallback: keyless OSM Nominatim. The dev TomTom key often has only the
    // Maps (tiles) product enabled, not Search — so reverse returns a readable
    // street name instead of raw coordinates. Nominatim policy: identify via
    // User-Agent, keep it to ~1 req/s (the picker debounces to one call).
    return this.nominatimReverse(point);
  }

  private async nominatimReverse(point: GeoPoint): Promise<string | null> {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`;
    try {
      const res = await this.fetchFn(url, {
        headers: { 'User-Agent': 'WashAndGo/1.0 (pilot; Zamboanga)' },
      });
      if (!res.ok) return this.warnNull('nominatimReverse', res.status);
      const body = (await res.json()) as {
        name?: string;
        display_name?: string;
        address?: Record<string, string>;
      };
      return shortLabel(body) ?? null;
    } catch (e) {
      this.logger.warn(`nominatimReverse error: ${String(e)}`);
      return null;
    }
  }

  async route(from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
    const coords = `${from.lat},${from.lng}:${to.lat},${to.lng}`;
    const url =
      `${this.base}/routing/1/calculateRoute/${coords}/json` +
      `?key=${this.apiKey}&travelMode=car`;
    const res = await this.fetchFn(url);
    if (!res.ok) {
      throw new Error(`TomTom routing failed (${res.status})`);
    }
    const body = (await res.json()) as {
      routes?: {
        summary?: { lengthInMeters?: number; travelTimeInSeconds?: number };
      }[];
    };
    const s = body.routes?.[0]?.summary;
    if (!s || s.lengthInMeters == null) {
      throw new Error('TomTom routing returned no route');
    }
    return {
      distanceKm: s.lengthInMeters / 1000,
      durationSec: s.travelTimeInSeconds ?? 0,
    };
  }

  private warnNull(op: string, status: number, q?: string): null {
    this.logger.warn(
      `TomTom ${op} ${status}${q ? ` for "${q}"` : ''} — degrading to null`,
    );
    return null;
  }
}
