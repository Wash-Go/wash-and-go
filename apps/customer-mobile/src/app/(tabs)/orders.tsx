import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { STATUS_META, statusLabel, type OrderView } from '@wash-and-go/domain';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  Pill,
  Screen,
  colors,
  peso,
  space,
  toneColor,
  type,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; orders: OrderView[] };

export default function OrdersScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const orders = await api.listOrders();
      setState({ kind: 'ready', orders });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not load your orders.',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your orders…" />
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
  if (state.orders.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          emoji="🧺"
          title="No orders yet"
          subtitle="Book your first express wash and it'll show up here."
          actionLabel="Book a wash"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {state.orders.map((o) => (
        <Card key={o.id} onPress={() => router.push(`/orders/${o.id}`)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={[type.title, { color: colors.text }]}>{o.code}</Text>
            <Pill text={statusLabel(o.status)} color={toneColor(STATUS_META[o.status].tone)} />
          </View>
          <Muted>{o.pickupAddress}</Muted>
          <Text
            style={[type.body, { color: colors.brand, fontWeight: '600', marginTop: space.xs }]}
          >
            {peso(o.customerTotalPhp)}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
