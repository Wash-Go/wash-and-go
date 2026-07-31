import {
  cartoTiles,
  leafletHtml,
  mapboxTiles,
  mapTilerTiles,
  osmTiles,
  resolveTiles,
  tomtomTiles,
} from './leaflet-map';

describe('tile presets', () => {
  it('mapbox uses @2x 512px tiles with the token baked in', () => {
    const t = mapboxTiles('tok123');
    expect(t.url).toContain('api.mapbox.com');
    expect(t.url).toContain('/512/{z}/{x}/{y}@2x');
    expect(t.url).toContain('access_token=tok123');
    expect(t.tileSize).toBe(512);
    expect(t.zoomOffset).toBe(-1);
    expect(t.detectRetina).toBe(false); // already @2x — don't double-request
  });

  it('maptiler uses @2x 512px tiles (free HD, no card)', () => {
    const t = mapTilerTiles('k1');
    expect(t.url).toContain('api.maptiler.com');
    expect(t.url).toContain('@2x.png?key=k1');
    expect(t.tileSize).toBe(512);
  });

  it('tomtom is 256px with detectRetina for sharpness', () => {
    const t = tomtomTiles('key9');
    expect(t.url).toContain('api.tomtom.com');
    expect(t.url).toContain('key=key9');
    expect(t.tileSize).toBe(256);
    expect(t.detectRetina).toBe(true);
  });

  it('carto is keyless and uses the {r} retina token for @2x sharpness', () => {
    const t = cartoTiles();
    expect(t.url).toContain('cartocdn.com');
    expect(t.url).toContain('{r}.png'); // Leaflet fills {r}=@2x on retina
    expect(t.url).not.toContain('key=');
  });

  it('osm is keyless', () => {
    expect(osmTiles().url).toContain('tile.openstreetmap.org');
  });
});

describe('resolveTiles', () => {
  it('honours an explicit provider when its key is present', () => {
    expect(resolveTiles({ provider: 'mapbox', mapboxToken: 't' }).url).toContain('mapbox');
    expect(resolveTiles({ provider: 'maptiler', mapTilerKey: 'k' }).url).toContain('maptiler');
    expect(resolveTiles({ provider: 'tomtom', tomtomKey: 'tt' }).url).toContain('tomtom');
    expect(resolveTiles({ provider: 'carto' }).url).toContain('cartocdn');
    expect(resolveTiles({ provider: 'osm' }).url).toContain('openstreetmap');
  });

  it('ignores an explicit provider whose key is missing, falling to CARTO', () => {
    // provider=mapbox but no token → default path → keyless CARTO (HD).
    expect(resolveTiles({ provider: 'mapbox' }).url).toContain('cartocdn');
  });

  it('with no provider, prefers a paid @2x key, else keyless CARTO', () => {
    expect(resolveTiles({ mapTilerKey: 'k', tomtomKey: 'tt' }).url).toContain('maptiler');
    expect(resolveTiles({ mapboxToken: 'm', tomtomKey: 'tt' }).url).toContain('mapbox');
    // A stray TomTom key must NOT pin us to low-res — CARTO wins by default.
    expect(resolveTiles({ tomtomKey: 'tt' }).url).toContain('cartocdn');
  });

  it('defaults to keyless CARTO (HD) when nothing is configured', () => {
    expect(resolveTiles({}).url).toContain('cartocdn');
  });
});

describe('leafletHtml', () => {
  const tiles = tomtomTiles('K');

  it('pick mode shows the centre pin and posts the map centre', () => {
    const html = leafletHtml(6.9, 122.0, tiles, 'pick');
    expect(html).toContain('id="pin"');
    expect(html).toContain('postMessage');
    expect(html).toContain("map.on('moveend'");
    expect(html).toContain('dragging:true');
  });

  it('view mode drops a marker, is read-only, and never posts', () => {
    const html = leafletHtml(6.9, 122.0, tiles, 'view');
    expect(html).toContain('L.marker([6.9,122]).addTo(map)');
    expect(html).not.toContain('postMessage');
    expect(html).toContain('dragging:false');
  });

  it('bakes the tile params (size/offset/retina) into the layer', () => {
    const html = leafletHtml(1, 2, mapboxTiles('tok'), 'view');
    expect(html).toContain('tileSize:512');
    expect(html).toContain('zoomOffset:-1');
    expect(html).toContain('access_token=tok');
  });
});
