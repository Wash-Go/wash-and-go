import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
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
import { LOAD_BUCKETS, LoadBucket } from '../lib/format';

export default function BookScreen() {
  const [bucket, setBucket] = useState<LoadBucket | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canContinue = !!bucket && !!coords && address.trim().length > 0;

  const cont = useCallback(() => {
    if (!bucket || !coords || !address.trim()) return;
    router.push({
      pathname: '/checkout',
      params: {
        weightKg: String(bucket.kg),
        pickupLat: String(coords.lat),
        pickupLng: String(coords.lng),
        pickupAddress: address.trim(),
      },
    });
  }, [bucket, coords, address]);

  return (
    <Screen>
      <Text style={styles.section}>How big is the load?</Text>
      <Muted>An estimate only — the shop weighs it at pickup and sets the final price.</Muted>
      <View style={{ gap: space.sm }}>
        {LOAD_BUCKETS.map((b) => {
          const selected = bucket?.key === b.key;
          return (
            <Card
              key={b.key}
              onPress={() => setBucket(b)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
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
              <View
                style={[
                  styles.radioDot,
                  { borderColor: selected ? colors.navy : colors.border },
                ]}
              >
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.section}>Where should we pick up?</Text>
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
});
