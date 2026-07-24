import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isTerminal, type OrderView } from '@wash-and-go/domain';
import { api } from '../../lib/api';
import {
  Card,
  ErrorState,
  Loading,
  Muted,
  PrimaryButton,
  Screen,
  StatusTimeline,
  colors,
  peso,
  space,
  type,
} from '@wash-and-go/ui';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderView };

const POLL_MS = 5000;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
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

  const doCancel = useCallback(async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.transition(id, 'CANCELLED');
      setConfirming(false);
      await fetchOnce(false);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  }, [id, fetchOnce]);

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

      {o.status === 'CANCELLED' ? (
        <Card style={{ backgroundColor: colors.navyTint }}>
          <Text style={[type.title, { color: colors.text }]}>Order cancelled</Text>
          {o.cancelReason ? <Muted>{o.cancelReason}</Muted> : null}
        </Card>
      ) : o.availableActions?.includes('CANCELLED') ? (
        <Card>
          {confirming ? (
            <View style={{ gap: space.sm }}>
              <Text style={[type.body, { color: colors.text }]}>
                Cancel this booking? This can’t be undone.
              </Text>
              <PrimaryButton
                label="Yes, cancel booking"
                tone="terra"
                onPress={doCancel}
                loading={cancelling}
              />
              <Pressable onPress={() => setConfirming(false)} accessibilityRole="button">
                <Text style={styles.keepLink}>Keep my booking</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              testID="cancel-order"
              onPress={() => setConfirming(true)}
              accessibilityRole="button"
            >
              <Text style={styles.cancelLink}>Cancel booking</Text>
            </Pressable>
          )}
          {cancelError ? <Text style={styles.cancelError}>{cancelError}</Text> : null}
        </Card>
      ) : null}
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
  cancelLink: { color: colors.terra, fontWeight: '700', ...type.body, textAlign: 'center' },
  keepLink: { color: colors.textMuted, fontWeight: '600', ...type.body, textAlign: 'center' },
  cancelError: { color: colors.danger, ...type.small, marginTop: space.xs },
});
