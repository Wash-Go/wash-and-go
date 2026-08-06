import { resolveTiles } from '@wash-and-go/ui';

// Tile provider resolved from env, shared by the rider app's map views. Same
// knobs as the customer app: set EXPO_PUBLIC_MAP_TILE_PROVIDER=maptiler|mapbox|
// tomtom|osm + the matching key; falls back to the sharpest key present.
export const mapTiles = resolveTiles({
  provider: process.env.EXPO_PUBLIC_MAP_TILE_PROVIDER,
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  mapTilerKey: process.env.EXPO_PUBLIC_MAPTILER_KEY,
  tomtomKey: process.env.EXPO_PUBLIC_TOMTOM_MAP_KEY,
});
