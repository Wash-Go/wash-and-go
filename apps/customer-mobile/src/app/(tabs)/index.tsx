import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ShopView } from '@wash-and-go/domain';
import {
  Card,
  EmptyState,
  ErrorState,
  H1,
  Loading,
  Muted,
  Screen,
  colors,
  peso,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; shops: ShopView[] };

export default function HomeScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const shops = await api.getShops();
      setState({ kind: 'ready', shops });
    } catch (e) {
      setState({
        kind: 'error',
        message:
          e instanceof Error ? e.message : 'Could not load shops. Check your connection.',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Finding laundry shops near you…" />
      </Screen>
    );
  }
  if (state.kind === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={state.message} onRetry={load} />
      </Screen>
    );
  }
  if (state.shops.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          emoji="🧺"
          title="No shops available yet"
          subtitle="We're onboarding laundry partners in Zamboanga. Check back soon."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Book a wash</H1>
      <Muted>Express pickup and delivery, same day. Tap a service to book.</Muted>

      {state.shops.map((shop) => (
        <Card key={shop.id}>
          <Text style={[type.title, { color: colors.text }]}>{shop.name}</Text>
          <Muted>{shop.address}</Muted>
          <View style={styles.services}>
            {shop.services.map((svc) => (
              <Card
                key={svc.id}
                style={styles.serviceRow}
                onPress={() =>
                  router.push({
                    pathname: '/book',
                    params: {
                      shopServiceId: svc.id,
                      shopName: shop.name,
                      serviceName: svc.name,
                      ratePhp: svc.ratePhp,
                      turnaround: String(svc.turnaroundHours),
                    },
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: colors.text, fontWeight: '600' }]}>
                    {svc.name}
                  </Text>
                  <Muted>{svc.turnaroundHours}h turnaround</Muted>
                </View>
                <Text style={[type.title, { color: colors.brand }]}>
                  {peso(svc.ratePhp)}
                  <Text style={type.small}>/kg</Text>
                </Text>
              </Card>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  services: { gap: space.sm, marginTop: space.sm },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brandTint,
    borderColor: 'transparent',
  },
});
