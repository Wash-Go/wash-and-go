/*
 * MapsProvider boundary (PLAN §1.7 D10). One interface, swappable adapters, so
 * geocoding + driving-distance can move from the haversine proxy to a real
 * vendor (TomTom first) without touching callers. The active adapter is chosen
 * by config; a haversine fallback keeps distance working with no key.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  point: GeoPoint;
  label: string; // human-readable address the vendor matched
  score?: number; // vendor match confidence (higher = better), when provided
}

export interface RouteResult {
  distanceKm: number; // driving distance (road), one way
  durationSec: number; // driving time estimate, one way
}

export interface MapsProvider {
  /** Identifier for logs/metrics, e.g. "tomtom" | "haversine". */
  readonly name: string;

  /** Address text → best-match coordinates, or null if nothing matched. */
  geocode(query: string): Promise<GeocodeResult | null>;

  /** Coordinates → a human-readable address, or null if unavailable. */
  reverseGeocode(point: GeoPoint): Promise<string | null>;

  /** One-way driving distance + duration between two points. */
  route(from: GeoPoint, to: GeoPoint): Promise<RouteResult>;
}
