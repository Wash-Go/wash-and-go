import type { ZoneVertex } from '@wash-and-go/domain';

export interface ParsedVertices {
  ok: boolean;
  vertices: ZoneVertex[];
  error: string | null;
}

// Parse a textarea of "lat,lng" lines into vertices. Needs >= 3 valid points.
export function parseVertices(text: string): ParsedVertices {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const vertices: ZoneVertex[] = [];
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length !== 2) {
      return { ok: false, vertices: [], error: `Bad line: "${line}" (use lat,lng)` };
    }
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { ok: false, vertices: [], error: `Bad latitude in "${line}"` };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { ok: false, vertices: [], error: `Bad longitude in "${line}"` };
    }
    vertices.push({ lat, lng });
  }
  if (vertices.length < 3) {
    return { ok: false, vertices, error: 'A zone needs at least 3 points' };
  }
  return { ok: true, vertices, error: null };
}

// Project vertices into an SVG viewBox [0,w]×[0,h] (lat up, lng right), padded.
// Returns a "x,y x,y …" points string for a <polygon>. Empty if < 3 points.
export function polygonSvgPoints(
  vertices: ZoneVertex[],
  w = 100,
  h = 100,
  pad = 6,
): string {
  if (vertices.length < 3) return '';
  const lats = vertices.map((v) => v.lat);
  const lngs = vertices.map((v) => v.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  return vertices
    .map((v) => {
      const x = pad + ((v.lng - minLng) / spanLng) * iw;
      // SVG y grows downward; flip so north is up.
      const y = pad + (1 - (v.lat - minLat) / spanLat) * ih;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
