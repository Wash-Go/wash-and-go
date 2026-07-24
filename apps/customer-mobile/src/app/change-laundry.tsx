import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ShopView } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  Loading,
  Muted,
  Screen,
  colors,
  peso,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';

export default function ChangeLaundryScreen() {
  const p = useLocalSearchParams<{
    loadCategory: string;
    pickupLat: string;
    pickupLng: string;
    pickupAddress: string;
    current?: string;
  }>();
  const lat = Number(p.pickupLat);
  const lng = Number(p.pickupLng);

  const [shops, setShops] = useState<ShopView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setShops(await api.getShops({ lat, lng }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load laundries.');
    }
  }, [lat, lng]);

  useEffect(() => {
    load();
  }, [load]);

  function choose(shopServiceId: string) {
    router.replace({
      pathname: '/checkout',
      params: {
        loadCategory: p.loadCategory,
        pickupLat: p.pickupLat,
        pickupLng: p.pickupLng,
        pickupAddress: p.pickupAddress,
        shopServiceId,
      },
    });
  }

  if (!shops && !error) {
    return (
      <Screen scroll={false}>
        <Loading label="Finding laundries near you…" />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>Nearest first · each shop sets its own rate.</Muted>
      {shops!.map((s, i) => {
        const svc = s.services[0];
        if (!svc) return null;
        const selected = svc.id === p.current;
        return (
          <Card
            key={s.id}
            onPress={() => choose(svc.id)}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[type.title, { color: colors.text, fontSize: 15 }]}>{s.name}</Text>
                {i === 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeT}>Closest</Text>
                  </View>
                ) : null}
              </View>
              <Muted>
                {s.distanceKm ?? '—'} km · {svc.turnaroundHours}h · {peso(svc.ratePhp)}/kg
              </Muted>
            </View>
          </Card>
        );
      })}
      <Text style={styles.note}>Farther shops add to the delivery fee.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.terra,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  note: { color: colors.terraDark, fontSize: 12, fontWeight: '600', marginTop: space.xs },
});
