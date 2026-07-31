import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { PrimaryButton } from './components';
import { leafletHtml, type MapTiles } from './leaflet-map';
import { colors, space, type as typo } from './theme';

// Center-pin map picker (Grab/Uber style): the map moves under a fixed pin; the
// map centre is the chosen point. Tiles are injected (see leaflet-map.ts) so the
// app picks the provider; `reverseGeocode` is injected so each app uses its own
// API client. Replaces the unreliable type-an-address flow.
const ZAMBOANGA: [number, number] = [6.9214, 122.079];

export function MapPicker({
  visible,
  initial,
  onClose,
  onPick,
  reverseGeocode,
  tiles,
  fallbackCenter = ZAMBOANGA,
}: {
  visible: boolean;
  initial?: { lat: number; lng: number } | null;
  onClose: () => void;
  onPick: (p: { lat: number; lng: number; address: string }) => void;
  /** Injected by the app's API client. Resolves a point to a human label. */
  reverseGeocode: (lat: number, lng: number) => Promise<{ label: string | null }>;
  tiles: MapTiles;
  fallbackCenter?: [number, number];
}) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState<string>('Move the map to your pickup point');
  const [resolving, setResolving] = useState(false);
  const revTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide the starting centre once the sheet opens: passed-in point → device
  // GPS → fallback (Zamboanga).
  useEffect(() => {
    if (!visible) {
      setCenter(null);
      return;
    }
    let cancelled = false;
    (async () => {
      if (initial) {
        if (!cancelled) setCenter([initial.lat, initial.lng]);
        return;
      }
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setCenter([pos.coords.latitude, pos.coords.longitude]);
            return;
          }
        }
      } catch {
        // fall through to default
      }
      if (!cancelled) setCenter(fallbackCenter);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initial, fallbackCenter]);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let c: { lat: number; lng: number };
      try {
        c = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      setCoords(c);
      // Debounce the reverse-geocode — one call after the map settles.
      if (revTimer.current) clearTimeout(revTimer.current);
      setResolving(true);
      revTimer.current = setTimeout(async () => {
        try {
          const { label: l } = await reverseGeocode(c.lat, c.lng);
          setLabel(l ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
        } catch {
          setLabel(`${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
        } finally {
          setResolving(false);
        }
      }, 450);
    },
    [reverseGeocode],
  );

  const confirm = () => {
    if (!coords) return;
    onPick({ lat: coords.lat, lng: coords.lng, address: label });
  };

  // Memoise the HTML so `source` keeps a stable identity across label/resolving
  // re-renders. An inline `source={{ html: ... }}` makes a new object every
  // render → RN WebView reloads the map → the reloaded map re-posts its centre
  // → setResolving/setLabel re-render → reload again: an infinite "Locating… ↔
  // address" flicker. Tying the html to [center, tiles] reloads it only when the
  // starting centre or tile source actually changes.
  const source = useMemo(
    () => (center ? { html: leafletHtml(center[0], center[1], tiles, 'pick') } : null),
    [center, tiles],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {source ? (
          <WebView
            style={{ flex: 1 }}
            originWhitelist={['*']}
            source={source}
            onMessage={onMessage}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.loading}>
            <Text style={typo.body}>Getting your location…</Text>
          </View>
        )}

        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={styles.sheet}>
          <Text style={styles.sheetLabel} numberOfLines={2}>
            {resolving ? 'Locating…' : label}
          </Text>
          <PrimaryButton
            label="Use this location"
            onPress={confirm}
            disabled={!coords}
            testID="map-confirm"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  closeText: { fontSize: 18, color: colors.text, fontWeight: '700' },
  sheet: {
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetLabel: { ...typo.title, color: colors.text },
});
