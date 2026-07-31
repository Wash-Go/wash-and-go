import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { PrimaryButton, colors, space, type as typo } from '@wash-and-go/ui';
import { api } from '../lib/api';

// Center-pin map picker (Grab/Uber style): the map moves under a fixed pin; the
// map centre is the chosen point. TomTom tiles via Leaflet in a WebView (reuses
// the TomTom key, cross-platform, no Google key). Replaces the unreliable
// type-an-address flow.
const KEY = process.env.EXPO_PUBLIC_TOMTOM_MAP_KEY ?? '';
const ZAMBOANGA: [number, number] = [6.9214, 122.079];

function mapHtml(lat: number, lng: number): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#e7eef5}
  #pin{position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);font-size:40px;z-index:1000;pointer-events:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
</style></head><body>
<div id="map"></div><div id="pin">📍</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
  L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${KEY}',{maxZoom:22,minZoom:5}).addTo(map);
  function post(){var c=map.getCenter();window.ReactNativeWebView.postMessage(JSON.stringify({lat:c.lat,lng:c.lng}));}
  map.on('moveend', post);
  setTimeout(post, 300);
</script></body></html>`;
}

export function MapPicker({
  visible,
  initial,
  onClose,
  onPick,
}: {
  visible: boolean;
  initial?: { lat: number; lng: number } | null;
  onClose: () => void;
  onPick: (p: { lat: number; lng: number; address: string }) => void;
}) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState<string>('Move the map to your pickup point');
  const [resolving, setResolving] = useState(false);
  const revTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide the starting centre once the sheet opens: passed-in point → device
  // GPS → Zamboanga fallback.
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
      if (!cancelled) setCenter(ZAMBOANGA);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initial]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
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
        const { label: l } = await api.reverseGeocode(c.lat, c.lng);
        setLabel(l ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
      } catch {
        setLabel(`${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
      } finally {
        setResolving(false);
      }
    }, 450);
  }, []);

  const confirm = () => {
    if (!coords) return;
    onPick({ lat: coords.lat, lng: coords.lng, address: label });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {center ? (
          <WebView
            style={{ flex: 1 }}
            originWhitelist={['*']}
            source={{ html: mapHtml(center[0], center[1]) }}
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
