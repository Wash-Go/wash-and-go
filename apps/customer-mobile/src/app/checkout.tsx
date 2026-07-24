import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { loadCategory as findLoadCategory } from '@wash-and-go/domain';
import type { LoadCategoryKey, OrderQuote } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  Loading,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  peso,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';

export default function CheckoutScreen() {
  const p = useLocalSearchParams<{
    loadCategory: LoadCategoryKey;
    pickupLat: string;
    pickupLng: string;
    pickupAddress: string;
    shopServiceId?: string;
  }>();
  const loadCategory = p.loadCategory;
  const cat = findLoadCategory(loadCategory);
  const estKg = cat?.estimateKg ?? 0;
  const catLabel = cat?.label ?? 'Load';
  const pickupLat = Number(p.pickupLat);
  const pickupLng = Number(p.pickupLng);
  const pickupAddress = p.pickupAddress ?? '';

  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await api.quoteOrder({
        pickupLat,
        pickupLng,
        loadCategory,
        shopServiceId: p.shopServiceId || undefined,
      });
      setQuote(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get a quote.');
    } finally {
      setLoading(false);
    }
  }, [pickupLat, pickupLng, loadCategory, p.shopServiceId]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const confirm = useCallback(async () => {
    if (!quote) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createOrder({
        shopServiceId: quote.shopServiceId,
        pickupAddress,
        pickupLat,
        pickupLng,
        loadCategory,
      });
      router.replace(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place your order.');
    } finally {
      setSubmitting(false);
    }
  }, [quote, pickupAddress, pickupLat, pickupLng, loadCategory]);

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Finding the nearest laundry…" />
      </Screen>
    );
  }
  if (error && !quote) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error} onRetry={loadQuote} />
      </Screen>
    );
  }
  if (!quote) return null;

  const b = quote.breakdown;
  return (
    <Screen>
      <Text style={styles.eyebrow}>Laundry</Text>
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: colors.text }]}>{quote.shop.name}</Text>
            <Muted>
              {quote.shop.distanceKm} km · {quote.shop.address}
            </Muted>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeT}>Closest</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Muted>Auto-picked the nearest laundry</Muted>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/change-laundry',
                params: {
                  loadCategory,
                  pickupLat: String(pickupLat),
                  pickupLng: String(pickupLng),
                  pickupAddress,
                  current: quote.shopServiceId,
                },
              })
            }
          >
            <Text style={styles.change}>Change ›</Text>
          </Pressable>
        </View>
      </Card>

      <Text style={styles.eyebrow}>Order</Text>
      <Card>
        <Text style={[type.body, { color: colors.text, fontWeight: '600' }]}>
          {catLabel} · ~{estKg}kg load
        </Text>
        <Muted>{pickupAddress}</Muted>
      </Card>

      <Card>
        <PriceRow label={`Wash · ~${estKg}kg`} value={peso(b.washValuePhp)} />
        <PriceRow label={`Delivery · ${quote.shop.distanceKm} km`} value={peso(b.deliveryFeePhp)} />
        <PriceRow label="Service fee" value={peso(b.serviceFeePhp)} />
        <View style={styles.divider} />
        <PriceRow label="Total" value={peso(b.customerTotalPhp)} strong />
        <Text style={styles.est}>Delivery adjusts by distance · final weight at the shop.</Text>
      </Card>

      {error ? <Text style={styles.errText}>{error}</Text> : null}
      <PrimaryButton
        label={submitting ? 'Booking…' : 'Confirm booking'}
        onPress={confirm}
        loading={submitting}
        disabled={submitting}
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
    <View style={styles.rowBetween}>
      <Text style={[strong ? type.title : type.body, { color: colors.text }]}>{label}</Text>
      <Text
        style={[
          strong ? type.title : type.body,
          { color: strong ? colors.navy : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: colors.terraDark,
    marginTop: space.xs,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    backgroundColor: colors.terra,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  change: { color: colors.terraDark, fontWeight: '700', fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space.xs },
  est: { color: colors.terraDark, fontSize: 12, fontWeight: '600' },
  errText: { color: colors.danger, ...type.body },
});
