import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isTerminal, type OrderView } from '@wash-and-go/domain';
import { api } from '../../lib/api';
import { peso } from '../../lib/format';
import { colors, space, type } from '../../lib/theme';
import { Card, ErrorState, Loading, Muted, Screen } from '../../components/ui';
import { StatusTimeline } from '../../components/StatusTimeline';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderView };

const POLL_MS = 5000;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOnce = useCallback(
    async (silent: boolean) => {
      if (!silent) setState({ kind: 'loading' });
      try {
        const order = await api.getOrder(id);
        setState({ kind: 'ready', order });
        // Keep polling only while the order is still moving.
        if (!isTerminal(order.status)) {
          timer.current = setTimeout(() => fetchOnce(true), POLL_MS);
        }
      } catch (e) {
        if (!silent) {
          setState({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Could not load this order.',
          });
        } else {
          // transient poll error — retry on the next tick
          timer.current = setTimeout(() => fetchOnce(true), POLL_MS);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    fetchOnce(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fetchOnce]);

  if (state.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your order…" />
      </Screen>
    );
  }
  if (state.kind === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={state.message} onRetry={() => fetchOnce(false)} />
      </Screen>
    );
  }

  const o = state.order;
  const weighed = o.weightKg != null;

  return (
    <Screen>
      <Card>
        <Text style={[type.h2, { color: colors.text }]}>{o.code}</Text>
        <Muted>{o.pickupAddress}</Muted>
      </Card>

      <Text style={styles.section}>Progress</Text>
      <Card>
        <StatusTimeline status={o.status} />
      </Card>

      <Text style={styles.section}>Price</Text>
      <Card>
        <Row label="Wash" value={peso(o.washValuePhp)} />
        <Row label="Express delivery" value={peso(o.deliveryFeePhp)} />
        <Row label="Service fee" value={peso(o.serviceFeePhp)} />
        <View style={styles.divider} />
        <Row label="Total" value={peso(o.customerTotalPhp)} strong />
        <Muted>
          {weighed
            ? `Final — weighed at ${o.weightKg}kg.`
            : `Estimate — based on ~${o.weightEstimateKg}kg until the shop weighs in.`}
        </Muted>
      </Card>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: space.xs,
  },
});
