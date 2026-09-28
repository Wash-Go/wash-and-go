// Distance + distance-based delivery fee (money-path plan). Interim uses
// haversine × a road-factor as a proxy for driving distance; swap the distance
// source for a routing API when the maps vendor (D10) lands — the fee formula
// stays the same. All params are config-driven (later: admin dynamic config).

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371;
const toRad = (d: number): number => (d * Math.PI) / 180;

// Great-circle distance in km.
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface DeliveryConfig {
  baseDeliveryPhp: number; // fixed base (e.g. 40)
  freeKm: number; // free round-trip km before per-km kicks in (e.g. 2)
  perKmPhp: number; // per billable km (e.g. 8)
  maxDeliveryPhp: number; // cap (e.g. 150)
  roadFactor: number; // haversine -> ~road multiplier (e.g. 1.3)
}

// delivery = base + max(0, roundTripKm − freeKm) × perKm, capped at max.
// roundTripKm = 2 × oneWayKm × roadFactor (courier does pickup + return legs).
// Returns an unrounded peso number; the pricing engine rounds it to 2dp.
export function computeDeliveryFee(
  oneWayKm: number,
  cfg: DeliveryConfig,
): number {
  const roundTripKm = 2 * Math.max(0, oneWayKm) * cfg.roadFactor;
  const billableKm = Math.max(0, roundTripKm - cfg.freeKm);
  const raw = cfg.baseDeliveryPhp + billableKm * cfg.perKmPhp;
  return Math.min(raw, cfg.maxDeliveryPhp);
}
