import type {
  GeocodeResult,
  GeoPoint,
  MapsProvider,
  RouteResult,
} from '@wash-and-go/maps';
import { haversineKm } from '../pricing/distance';

/*
 * Keyless fallback. Distance is straight-line haversine (the fee path applies
 * the road-factor); geocoding is unavailable without a vendor, so those return
 * null. Selected when no maps key is configured, so distance keeps working.
 */
export class HaversineProvider implements MapsProvider {
  readonly name = 'haversine';

  async geocode(_query: string): Promise<GeocodeResult | null> {
    return null;
  }

  async reverseGeocode(_point: GeoPoint): Promise<string | null> {
    return null;
  }

  async route(from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
    return { distanceKm: haversineKm(from, to), durationSec: 0 };
  }
}
