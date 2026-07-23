import { parseVertices, polygonSvgPoints } from './zones';

describe('parseVertices', () => {
  it('parses valid lat,lng lines', () => {
    const r = parseVertices('6.88, 122.05\n6.88, 122.11\n6.94, 122.08');
    expect(r.ok).toBe(true);
    expect(r.vertices).toEqual([
      { lat: 6.88, lng: 122.05 },
      { lat: 6.88, lng: 122.11 },
      { lat: 6.94, lng: 122.08 },
    ]);
  });

  it('rejects fewer than 3 points', () => {
    const r = parseVertices('6.88,122.05\n6.9,122.1');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least 3/);
  });

  it('rejects a malformed line', () => {
    expect(parseVertices('6.88 122.05\n1,1\n2,2').ok).toBe(false);
  });

  it('rejects out-of-range coordinates', () => {
    expect(parseVertices('91,0\n1,1\n2,2').error).toMatch(/latitude/i);
    expect(parseVertices('1,181\n1,1\n2,2').error).toMatch(/longitude/i);
  });
});

describe('polygonSvgPoints', () => {
  it('is empty for < 3 vertices', () => {
    expect(polygonSvgPoints([{ lat: 0, lng: 0 }])).toBe('');
  });

  it('projects a square into the padded viewbox with north up', () => {
    const pts = polygonSvgPoints(
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
      ],
      100,
      100,
      10,
    );
    // lat=0 (south) → bottom (y=90); lat=1 (north) → top (y=10).
    expect(pts).toBe('10.0,90.0 90.0,90.0 90.0,10.0 10.0,10.0');
  });
});
