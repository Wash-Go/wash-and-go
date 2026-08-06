import { pointInPolygon, ZAMBOANGA_PILOT_RING, type LatLng } from './geo';

// A unit square [0,1]×[0,1] in lat/lng.
const SQUARE: LatLng[] = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
  { lat: 1, lng: 0 },
];

describe('pointInPolygon', () => {
  it('is true for a point clearly inside', () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, SQUARE)).toBe(true);
  });

  it('is false for a point clearly outside', () => {
    expect(pointInPolygon({ lat: 2, lng: 2 }, SQUARE)).toBe(false);
    expect(pointInPolygon({ lat: 0.5, lng: -0.5 }, SQUARE)).toBe(false);
  });

  it('is false for a degenerate ring (< 3 vertices)', () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, [{ lat: 0, lng: 0 }])).toBe(false);
  });

  it('covers central Zamboanga and rejects points outside the pilot ring', () => {
    // Central ZC (Tetuan-ish) inside.
    expect(pointInPolygon({ lat: 6.9111, lng: 122.0794 }, ZAMBOANGA_PILOT_RING)).toBe(true);
    // Manila — far outside.
    expect(pointInPolygon({ lat: 14.6, lng: 120.98 }, ZAMBOANGA_PILOT_RING)).toBe(false);
    // Just south of the ring.
    expect(pointInPolygon({ lat: 6.7, lng: 122.08 }, ZAMBOANGA_PILOT_RING)).toBe(false);
  });
});
