import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { PricingBreakdown } from '@wash-and-go/domain';
import { api } from '../lib/api';
import { LOAD_BUCKETS, LoadBucket, peso } from '../lib/format';
import { colors, radius, space, type } from '../lib/theme';
import { Card, Muted, PrimaryButton, Screen } from '../components/ui';

export default function BookScreen() {
  const params = useLocalSearchParams<{
    shopServiceId: string;
    shopName?: string;
    serviceName?: string;
    turnaround?: string;
  }>();
  const shopServiceId = params.shopServiceId;

  const [bucket, setBucket] = useState<LoadBucket | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [preview, setPreview] = useState<PricingBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-price whenever the load bucket changes (server is the money source).
  useEffect(() => {
    if (!bucket) {
      setPreview(null);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    setError(null);
    api
      .previewOrder({ shopServiceId, weightKg: bucket.kg })
      .then((b) => active && setPreview(b))
      .catch((e) => {
        if (!active) return;
        setPreview(null);
        setError(e instanceof Error ? e.message : 'Could not price this order');
      })
      .finally(() => active && setPreviewLoading(false));
    return () => {
      active = false;
    };
  }, [bucket, shopServiceId]);

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
        // reverse geocode is best-effort; the coords are what matter
      }
    } catch {
      setError('Could not read your location. Try again or type your address.');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const canConfirm =
    !!bucket && !!coords && address.trim().length > 0 && !!preview && !submitting;

  const confirm = useCallback(async () => {
    if (!bucket || !coords || !address.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createOrder({
        shopServiceId,
        pickupAddress: address.trim(),
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        weightEstimateKg: bucket.kg,
      });
      router.replace(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place your order.');
    } finally {
      setSubmitting(false);
    }
  }, [bucket, coords, address, shopServiceId]);

  return (
    <Screen>
      <Card>
        <Text style={[type.title, { color: colors.text }]}>
          {params.shopName ?? 'Selected shop'}
        </Text>
        <Muted>
          {params.serviceName ?? 'Service'}
          {params.turnaround ? ` · ${params.turnaround}h turnaround` : ''}
        </Muted>
      </Card>

      <Text style={styles.section}>How big is the load?</Text>
      <Muted>An estimate only — the shop weighs it at pickup and prices the final amount.</Muted>
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
                borderColor: selected ? colors.brand : colors.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                backgroundColor: selected ? colors.brandTint : colors.surface,
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
                  { borderColor: selected ? colors.brand : colors.border },
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
      />
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Pickup address (street, barangay)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
      />

      {previewLoading ? (
        <Card>
          <Muted>Pricing…</Muted>
        </Card>
      ) : preview ? (
        <Card>
          <PriceRow label="Wash" value={peso(preview.washValuePhp)} />
          <PriceRow label="Express delivery" value={peso(preview.deliveryFeePhp)} />
          <PriceRow label="Service fee" value={peso(preview.serviceFeePhp)} />
          <View style={styles.divider} />
          <PriceRow label="Estimated total" value={peso(preview.customerTotalPhp)} strong />
          <Muted>Estimate — final amount is set when the shop weighs your laundry.</Muted>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={submitting ? 'Booking…' : 'Confirm booking'}
        onPress={confirm}
        disabled={!canConfirm}
        loading={submitting}
      />
    </Screen>
  );
}

function PriceRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[strong ? type.title : type.body, { color: colors.text }]}>
        {label}
      </Text>
      <Text
        style={[
          strong ? type.title : type.body,
          { color: strong ? colors.brand : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
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
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: space.xs,
  },
  error: { color: colors.danger, ...type.body },
});
