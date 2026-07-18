/*
 * Coverage gate (plan D3). MVP: one hardcoded Zamboanga City polygon, checked
 * point-in-polygon before an order is created. This seeds the pattern that the
 * scheduled engine formalizes into real zones later. Maps vendor (D10) is still
 * open; nothing here depends on it.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

// Rough coverage ring around Zamboanga City proper (lng, lat). Deliberately
// generous for the pilot; tightened once real zones land. Ring is closed
// implicitly by the ray-cast (first/last need not repeat).
export const ZAMBOANGA_COVERAGE: LngLat[] = [
  { lng: 122.02, lat: 6.86 },
  { lng: 122.14, lat: 6.86 },
  { lng: 122.14, lat: 6.98 },
  { lng: 122.02, lat: 6.98 },
];

// Standard ray-casting point-in-polygon. Returns true if the point is inside
// the ring (edges count as inside is not guaranteed — fine for a coverage gate).
export function isWithinCoverage(
  point: LngLat,
  polygon: LngLat[] = ZAMBOANGA_COVERAGE,
): boolean {
  const { lng: x, lat: y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
