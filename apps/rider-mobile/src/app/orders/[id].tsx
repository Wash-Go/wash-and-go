import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  H2,
  Loading,
  Muted,
  PrimaryButton,
  Screen,
  SlideToConfirm,
  StatusTimeline,
  colors,
  peso,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';
import { actionLabel, needsConfirm } from '../../lib/triage';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderView };

function call(phone?: string) {
  if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
}
function navigate(address?: string) {
  if (address) {
    Linking.openURL(
      `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    ).catch(() => {});
  }
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setState({ kind: 'loading' });
      try {
        const order = await api.getOrder(id);
        setState({ kind: 'ready', order });
      } catch (e) {
        if (!silent) {
          setState({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Could not load this job.',
          });
        }
      }
    },
    [id],
  );

  useEffect(() => {
    load(false);
    // Poll so a status change driven elsewhere (shop/admin) shows up live.
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
  }, [load]);

  const drive = useCallback(
    async (status: OrderStatus) => {
      setBusy(true);
      try {
        await api.transition(id, status);
        await load(true);
      } catch (e) {
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : 'That action failed.',
        });
      } finally {
        setBusy(false);
      }
    },
    [id, load],
  );

  const recordCash = useCallback(async () => {
    setBusy(true);
    try {
      await api.payCash(id);
      await load(true);
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not record cash.',
      });
    } finally {
      setBusy(false);
    }
  }, [id, load]);

  if (state.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Loading job…" />
      </Screen>
    );
  }
  if (state.kind === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={state.message} onRetry={() => load(false)} />
      </Screen>
    );
  }

  const o = state.order;
  const actions = o.availableActions ?? [];
  const showCash = o.status === 'DELIVERED' && !o.paidCashAt;

  return (
    <Screen>
      <Card>
        <H2>{o.code}</H2>
        <Muted>Total {peso(o.customerTotalPhp)} · cash</Muted>
      </Card>

      <Card>
        <Text style={styles.label}>Pick up from customer</Text>
        <Text style={[type.body, { color: colors.text }]}>{o.pickupAddress}</Text>
        <View style={styles.rowBtns}>
          {o.customer?.phone ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton label="📞 Call" onPress={() => call(o.customer?.phone)} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton label="🧭 Navigate" onPress={() => navigate(o.pickupAddress)} />
          </View>
        </View>
      </Card>

      {o.shop ? (
        <Card>
          <Text style={styles.label}>Drop off at shop</Text>
          <Text style={[type.body, { color: colors.text }]}>{o.shop.name}</Text>
          <Muted>{o.shop.address}</Muted>
          <PrimaryButton label="🧭 Navigate to shop" onPress={() => navigate(o.shop?.address)} />
        </Card>
      ) : null}

      <Text style={styles.section}>Progress</Text>
      <Card>
        <StatusTimeline status={o.status} />
      </Card>

      {actions.length > 0 || showCash ? (
        <View style={{ gap: space.md }}>
          <Text style={styles.section}>Next</Text>
          {actions.map((a) =>
            needsConfirm(a) ? (
              <SlideToConfirm
                key={a}
                label={`Slide to ${actionLabel(a).toLowerCase()}`}
                onConfirm={() => !busy && drive(a)}
              />
            ) : (
              <PrimaryButton
                key={a}
                label={actionLabel(a)}
                onPress={() => drive(a)}
                loading={busy}
              />
            ),
          )}
          {showCash ? (
            <SlideToConfirm
              label="Slide to record cash collected"
              color={colors.success}
              onConfirm={() => !busy && recordCash()}
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.textMuted, fontWeight: '600' },
  section: { ...type.h2, color: colors.text, marginTop: space.md },
  rowBtns: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
