import { Logger } from '@nestjs/common';
import type {
  GeocodeResult,
  GeoPoint,
  MapsProvider,
  RouteResult,
} from '@wash-and-go/maps';

// Injectable fetch so specs can drive the adapter without real HTTP.
export type FetchLike = (url: string) => Promise<{
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
export class TomTomProvider implements MapsProvider {
  readonly name = 'tomtom';
  private readonly logger = new Logger('TomTomProvider');
  private readonly base = 'https://api.tomtom.com';

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = (url) => fetch(url),
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

  async reverseGeocode(point: GeoPoint): Promise<string | null> {
    const url =
      `${this.base}/search/2/reverseGeocode/${point.lat},${point.lng}.json` +
      `?key=${this.apiKey}`;
    try {
      const res = await this.fetchFn(url);
      if (!res.ok) return this.warnNull('reverseGeocode', res.status);
      const body = (await res.json()) as {
        addresses?: { address?: { freeformAddress?: string } }[];
      };
      return body.addresses?.[0]?.address?.freeformAddress ?? null;
    } catch (e) {
      this.logger.warn(`reverseGeocode error: ${String(e)}`);
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
