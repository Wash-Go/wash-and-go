import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  H2,
  Loading,
  MapView,
  Muted,
  PrimaryButton,
  Screen,
  SlideToConfirm,
  StatusTimeline,
  colors,
  peso,
  space,
  type,
  useToast,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';
import { mapTiles } from '../../components/mapTiles';
import { actionLabel, needsConfirm } from '../../lib/triage';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; order: OrderView };

function call(phone?: string) {
  if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
}
// Prefer exact coordinates (the customer pinned them on the map) — a text
// address is fuzzy and can resolve blocks away. Falls back to text only when
// coords are missing (older orders).
function navigateTo(lat?: number | null, lng?: number | null, address?: string) {
  const dest =
    lat != null && lng != null
      ? `${lat},${lng}`
      : address
        ? encodeURIComponent(address)
        : null;
  if (dest) {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    ).catch(() => {});
  }
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

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
        toast.success('Job updated.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'That action failed.');
      } finally {
        setBusy(false);
      }
    },
    [id, load, toast],
  );

  const recordCash = useCallback(async () => {
    setBusy(true);
    try {
      await api.payCash(id);
      await load(true);
      toast.success('Cash recorded.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not record cash.');
    } finally {
      setBusy(false);
    }
  }, [id, load, toast]);

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
  const plat = o.pickupLat != null ? Number(o.pickupLat) : null;
  const plng = o.pickupLng != null ? Number(o.pickupLng) : null;
  const hasPin = plat != null && Number.isFinite(plat) && plng != null && Number.isFinite(plng);

  return (
    <Screen>
      <Card>
        <H2>{o.code}</H2>
        <Muted>Total {peso(o.customerTotalPhp)} · cash</Muted>
      </Card>

      <Card>
        <Text style={styles.label}>Pick up from customer</Text>
        <Text style={[type.body, { color: colors.text }]}>{o.pickupAddress}</Text>
        {hasPin ? (
          <View style={{ marginTop: space.sm }}>
            <MapView lat={plat as number} lng={plng as number} tiles={mapTiles} />
          </View>
        ) : null}
        <View style={styles.rowBtns}>
          {o.customer?.phone ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton label="📞 Call" onPress={() => call(o.customer?.phone)} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="🧭 Navigate"
              onPress={() => navigateTo(plat, plng, o.pickupAddress)}
            />
          </View>
        </View>
      </Card>

      {o.shop ? (
        <Card>
          <Text style={styles.label}>Drop off at shop</Text>
          <Text style={[type.body, { color: colors.text }]}>{o.shop.name}</Text>
          <Muted>{o.shop.address}</Muted>
          <PrimaryButton
            label="🧭 Navigate to shop"
            onPress={() => navigateTo(null, null, o.shop?.address)}
          />
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
