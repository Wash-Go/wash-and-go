import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AddressView } from '@wash-and-go/domain';
import {
  Card,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  radius,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';
import { LOAD_BUCKETS, LoadBucket } from '../lib/format';

export default function BookScreen() {
  const [bucket, setBucket] = useState<LoadBucket | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AddressView[]>([]);
  const [saveNew, setSaveNew] = useState(false);

  // Load the address book to prefill pickup (best-effort — booking works without).
  useEffect(() => {
    api
      .getAddresses()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  const pickSaved = useCallback((a: AddressView) => {
    setAddress(a.line);
    setSaveNew(false);
    if (a.lat != null && a.lng != null) {
      setCoords({ lat: Number(a.lat), lng: Number(a.lng) });
    }
  }, []);

  // Geocode the typed address → pin its coordinates (no GPS needed).
  const findAddress = useCallback(async () => {
    const q = address.trim();
    if (q.length < 2) return;
    setGeoLoading(true);
    setError(null);
    try {
      const hit = await api.geocode(q);
      if (hit) {
        setCoords(hit.point);
        setAddress(hit.label);
      } else {
        setError('No match for that address. Try GPS or add more detail.');
      }
    } catch {
      setError('Could not search that address. Try again or use GPS.');
    } finally {
      setGeoLoading(false);
    }
  }, [address]);

  const useMyLocation = useCallback(async () => {
    setGpsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to set your pickup point.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          setAddress(
            [place.name, place.street, place.district, place.city]
              .filter(Boolean)
              .join(', '),
          );
        }
      } catch {
        // best-effort
      }
    } catch {
      setError('Could not read your location. Try again or type your address.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // Over-threshold loads belong to Scheduled (Tier 1), not live yet — can't book them Express.
  const canContinue =
    !!bucket && bucket.expressEligible && !!coords && address.trim().length > 0;

  const cont = useCallback(() => {
    if (!bucket || !bucket.expressEligible || !coords || !address.trim()) return;
    const line = address.trim();
    // Best-effort save to the address book so it's reusable next time.
    if (saveNew && !saved.some((a) => a.line === line)) {
      api
        .createAddress({ line, lat: coords.lat, lng: coords.lng })
        .catch(() => undefined);
    }
    router.push({
      pathname: '/checkout',
      params: {
        loadCategory: bucket.key,
        pickupLat: String(coords.lat),
        pickupLng: String(coords.lng),
        pickupAddress: line,
      },
    });
  }, [bucket, coords, address, saveNew, saved]);

  return (
    <Screen>
      <Text style={styles.section}>How big is the load?</Text>
      <Muted>An estimate only — the shop weighs it at pickup and sets the final price.</Muted>
      <View style={{ gap: space.sm }}>
        {LOAD_BUCKETS.map((b) => {
          const selected = bucket?.key === b.key;
          const eligible = b.expressEligible;
          return (
            <Card
              key={b.key}
              testID={`bucket-${b.key}`}
              onPress={eligible ? () => setBucket(b) : undefined}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: eligible ? 1 : 0.55,
                borderColor: selected ? colors.navy : colors.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                backgroundColor: selected ? colors.navyTint : colors.surface,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.text, fontWeight: '600' }]}>
                  {b.label} · about {b.kg}kg
                </Text>
                <Muted>{b.example}</Muted>
              </View>
              {eligible ? (
                <View
                  style={[
                    styles.radioDot,
                    { borderColor: selected ? colors.navy : colors.border },
                  ]}
                >
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              ) : (
                <View style={styles.schedBadge} testID={`bucket-${b.key}-scheduled`}>
                  <Text style={styles.schedBadgeT}>Scheduled soon</Text>
                </View>
              )}
            </Card>
          );
        })}
      </View>
      <Muted>Large loads move to our Scheduled service (coming soon).</Muted>

      <Text style={styles.section}>Where should we pick up?</Text>

      {saved.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Muted>Saved addresses</Muted>
          {saved.map((a) => {
            const selected = address.trim() === a.line;
            return (
              <Card
                key={a.id}
                onPress={() => pickSaved(a)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  borderColor: selected ? colors.navy : colors.border,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: selected ? colors.navyTint : colors.surface,
                }}
              >
                <Text style={{ fontSize: 16 }}>📍</Text>
                <View style={{ flex: 1 }}>
                  {a.label ? (
                    <Text style={[type.body, { color: colors.text, fontWeight: '600' }]}>
                      {a.label}
                    </Text>
                  ) : null}
                  <Muted>{a.line}</Muted>
                </View>
                {a.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeT}>Default</Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
          <Muted>Or enter a new one:</Muted>
        </View>
      ) : null}

      <PrimaryButton
        label={coords ? '📍 Location set — update' : '📍 Use my location'}
        onPress={useMyLocation}
        loading={gpsLoading}
        tone="terra"
      />
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Pickup address (street, barangay)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
      />

      <Pressable
        onPress={findAddress}
        disabled={address.trim().length < 2 || geoLoading}
        style={({ pressed }) => [
          styles.findBtn,
          (address.trim().length < 2 || geoLoading) && { opacity: 0.5 },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.findBtnT}>
          {geoLoading ? 'Searching…' : '🔎 Find this address'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setSaveNew((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: saveNew }}
      >
        <View style={[styles.check, saveNew && styles.checkOn]}>
          {saveNew ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={[type.body, { color: colors.text }]}>Save this pickup for next time</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label="Continue" onPress={cont} disabled={!canContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h2, color: colors.text, marginTop: space.md },
  radioDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.navy },
  schedBadge: {
    backgroundColor: colors.navyTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  schedBadgeT: { color: colors.navy, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.danger, ...type.body },
  defaultBadge: {
    backgroundColor: colors.terra,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  defaultBadgeT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  findBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.navy,
    backgroundColor: colors.navyTint,
  },
  findBtnT: { color: colors.navy, fontWeight: '700', fontSize: 13 },
});
