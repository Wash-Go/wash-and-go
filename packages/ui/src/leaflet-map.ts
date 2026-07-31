// Shared Leaflet-in-a-WebView map HTML + tile presets, used by both MapPicker
// (customer, pan-to-choose) and MapView (rider, read-only pin + navigate).
//
// Tiles are pluggable: Mapbox gives crisp @2x retina tiles (the HD look), TomTom
// is a keyless-on-our-key fallback, OSM is the last resort. Swap providers with
// one env var — no component change. Reverse-geocoding is NOT done here (it's a
// backend concern; Mapbox geocoding can't be stored, we use Nominatim).

export interface MapTiles {
  /** Leaflet URL template with {z}/{x}/{y} and the token/key baked in. */
  url: string;
  /** 512 for Mapbox @2x (fewer, sharper tiles), 256 for classic raster. */
  tileSize: number;
  /** -1 pairs with tileSize 512 so zoom levels still line up. */
  zoomOffset: number;
  /** Load higher-zoom tiles on retina screens (classic-raster sharpness lever). */
  detectRetina: boolean;
  /** Short attribution string (ODbL/vendor requirement). */
  attribution: string;
}

// Mapbox raster @2x 512px — the HD tiles. `style` defaults to streets; pass
// e.g. 'satellite-streets-v12' for imagery. Token is a public client token.
export function mapboxTiles(token: string, style = 'streets-v12'): MapTiles {
  return {
    url: `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
    tileSize: 512,
    zoomOffset: -1,
    detectRetina: false, // already @2x; detectRetina would double-request
    attribution: '© Mapbox © OpenStreetMap',
  };
}

// MapTiler raster @2x 512px — HD like Mapbox but free 100k/mo with no credit
// card. `style` defaults to streets-v2; 'hybrid' for satellite. Public key.
export function mapTilerTiles(key: string, style = 'streets-v2'): MapTiles {
  return {
    url: `https://api.maptiler.com/maps/${style}/512/{z}/{x}/{y}@2x.png?key=${key}`,
    tileSize: 512,
    zoomOffset: -1,
    detectRetina: false, // already @2x
    attribution: '© MapTiler © OpenStreetMap',
  };
}

// TomTom basic raster (256px). detectRetina buys some sharpness since our dev
// key rejects tileSize=512.
export function tomtomTiles(key: string): MapTiles {
  return {
    url: `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${key}`,
    tileSize: 256,
    zoomOffset: 0,
    detectRetina: true,
    attribution: '© TomTom',
  };
}

// Keyless OpenStreetMap raster — final fallback when no token/key is set.
export function osmTiles(): MapTiles {
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileSize: 256,
    zoomOffset: 0,
    detectRetina: true,
    attribution: '© OpenStreetMap',
  };
}

// Resolve tiles from an app's env-derived config. `provider` chooses the source;
// falls back gracefully to whatever key is present, then keyless OSM.
export function resolveTiles(cfg: {
  provider?: string;
  mapboxToken?: string;
  mapTilerKey?: string;
  tomtomKey?: string;
}): MapTiles {
  const p = (cfg.provider ?? '').toLowerCase();
  if (p === 'mapbox' && cfg.mapboxToken) return mapboxTiles(cfg.mapboxToken);
  if (p === 'maptiler' && cfg.mapTilerKey) return mapTilerTiles(cfg.mapTilerKey);
  if (p === 'osm') return osmTiles();
  // No explicit provider: prefer the sharpest key we actually have.
  if (cfg.mapTilerKey) return mapTilerTiles(cfg.mapTilerKey);
  if (cfg.mapboxToken) return mapboxTiles(cfg.mapboxToken);
  if (cfg.tomtomKey) return tomtomTiles(cfg.tomtomKey);
  return osmTiles();
}

// Build the Leaflet page. mode 'pick' shows a fixed centre pin and posts the
// map centre on every settle (the caller reverse-geocodes it). mode 'view'
// drops a marker at the point and is read-only (no messaging).
export function leafletHtml(
  lat: number,
  lng: number,
  tiles: MapTiles,
  mode: 'pick' | 'view',
): string {
  const pin =
    mode === 'pick'
      ? `<div id="pin">📍</div>`
      : '';
  const markerJs =
    mode === 'view'
      ? `L.marker([${lat},${lng}]).addTo(map);`
      : `function post(){var c=map.getCenter();window.ReactNativeWebView.postMessage(JSON.stringify({lat:c.lat,lng:c.lng}));}
         map.on('moveend', post); setTimeout(post, 300);`;
  const interactive = mode === 'view' ? 'false' : 'true';
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#e7eef5}
  #pin{position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);font-size:40px;z-index:1000;pointer-events:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
</style></head><body>
<div id="map"></div>${pin}
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false,dragging:${interactive},tap:${interactive}}).setView([${lat},${lng}],17);
  L.tileLayer('${tiles.url}',{maxZoom:22,minZoom:5,tileSize:${tiles.tileSize},zoomOffset:${tiles.zoomOffset},detectRetina:${tiles.detectRetina}}).addTo(map);
  ${markerJs}
</script></body></html>`;
}
