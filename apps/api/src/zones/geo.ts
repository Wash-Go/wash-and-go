export interface LatLng {
  lat: number;
  lng: number;
}

/*
 * Standard ray-casting point-in-polygon. The ring is a list of {lat,lng}
 * vertices; it is closed implicitly (first/last need not repeat). Edge cases on
 * the boundary are not guaranteed either way — fine for a coverage gate. This is
 * the same algorithm the retired orders/coverage.ts used, moved here so zones
 * own it.
 */
export function pointInPolygon(point: LatLng, ring: LatLng[]): boolean {
  if (ring.length < 3) return false;
  const x = point.lng;
  const y = point.lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// The pilot Zamboanga City ring — the DB seed default when no zones exist yet,
// so coverage keeps working before an admin draws real zones.
export const ZAMBOANGA_PILOT_RING: LatLng[] = [
  { lat: 6.86, lng: 122.02 },
  { lat: 6.86, lng: 122.14 },
  { lat: 6.98, lng: 122.14 },
  { lat: 6.98, lng: 122.02 },
];
