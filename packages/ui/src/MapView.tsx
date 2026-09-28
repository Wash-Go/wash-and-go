import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { PrimaryButton } from './components';
import { leafletHtml, type MapTiles } from './leaflet-map';
import { colors, radius } from './theme';

// Read-only map: drops a pin at a fixed point (e.g. a rider's pickup). No
// picking, no reverse-geocode — just "here's the spot" plus an optional
// Navigate button that hands the exact coords to the device's maps app. Shares
// the same tiles/Leaflet renderer as MapPicker (see leaflet-map.ts).
export function MapView({
  lat,
  lng,
  tiles,
  height = 180,
  onNavigate,
  navigateLabel = '🧭 Navigate',
}: {
  lat: number;
  lng: number;
  tiles: MapTiles;
  height?: number;
  /** When set, renders a Navigate button below the map. */
  onNavigate?: () => void;
  navigateLabel?: string;
}) {
  const source = useMemo(
    () => ({ html: leafletHtml(lat, lng, tiles, 'view') }),
    [lat, lng, tiles],
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.mapBox, { height }]}>
        <WebView
          style={{ flex: 1, backgroundColor: '#e7eef5' }}
          originWhitelist={['*']}
          source={source}
          scrollEnabled={false}
          pointerEvents="none"
        />
      </View>
      {onNavigate ? <PrimaryButton label={navigateLabel} onPress={onNavigate} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
