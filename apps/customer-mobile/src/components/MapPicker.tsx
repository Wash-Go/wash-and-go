import React from 'react';
import { MapPicker as UIMapPicker, resolveTiles } from '@wash-and-go/ui';
import { api } from '../lib/api';

// App-local wrapper: injects this app's API client (reverse-geocode) and the
// tile provider resolved from env into the shared UI picker. Tile provider is
// pluggable — set EXPO_PUBLIC_MAP_TILE_PROVIDER=maptiler|mapbox|tomtom|osm and
// the matching key; falls back to the sharpest key present, then keyless OSM.
const tiles = resolveTiles({
  provider: process.env.EXPO_PUBLIC_MAP_TILE_PROVIDER,
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  mapTilerKey: process.env.EXPO_PUBLIC_MAPTILER_KEY,
  tomtomKey: process.env.EXPO_PUBLIC_TOMTOM_MAP_KEY,
});

export function MapPicker(props: {
  visible: boolean;
  initial?: { lat: number; lng: number } | null;
  onClose: () => void;
  onPick: (p: { lat: number; lng: number; address: string }) => void;
}) {
  return (
    <UIMapPicker
      {...props}
      tiles={tiles}
      reverseGeocode={(lat, lng) => api.reverseGeocode(lat, lng)}
    />
  );
}
