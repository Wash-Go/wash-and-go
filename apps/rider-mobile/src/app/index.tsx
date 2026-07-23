import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  elevation,
  radius,
  space,
  toneColor,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';
import { actionLabel, GROUP_LABEL, jobGroup, sortJobs } from '../lib/triage';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; jobs: OrderView[] };

const GROUP_COLOR = {
  action: colors.terra,
  waiting: colors.warning,
  done: colors.textMuted,
} as const;

export default function JobsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const jobs = await api.listOrders();
      setState({ kind: 'ready', jobs: sortJobs(jobs) });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not load your jobs.',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your jobs…" />
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
  if (state.jobs.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          emoji="✅"
          title="All caught up"
          subtitle="No jobs assigned. New pickups land here."
        />
      </Screen>
    );
  }

  const needsAction = state.jobs.filter((j) => jobGroup(j) === 'action').length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My jobs</Text>
        <Text style={styles.count}>
          {state.jobs.length} active
          {needsAction > 0 ? ` · ${needsAction} need${needsAction > 1 ? '' : 's'} you` : ''}
        </Text>
      </View>

      {state.jobs.map((j) => {
        const group = jobGroup(j);
        const next = j.availableActions?.[0];
        const isAction = group === 'action';
        return (
          <Card
            key={j.id}
            onPress={() => router.push(`/orders/${j.id}`)}
            style={isAction ? styles.actionCard : undefined}
          >
            <View style={styles.row}>
              <View style={[styles.icon, isAction && { backgroundColor: colors.terraTint }]}>
                <Feather
                  name={isAction ? 'navigation' : 'package'}
                  size={18}
                  color={isAction ? colors.terraDark : colors.navy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.title, { color: colors.text }]}>{j.code}</Text>
                <View style={styles.addr}>
                  <Feather name="map-pin" size={12} color={colors.textFaint} />
                  <Muted>{j.pickupAddress}</Muted>
                </View>
              </View>
              <Pill text={statusLabel(j.status)} color={toneColor(STATUS_META[j.status].tone)} />
            </View>

            {isAction && next ? (
              <View style={styles.nextChip}>
                <Text style={styles.nextText}>{actionLabel(next)}</Text>
                <Feather name="arrow-right" size={15} color="#fff" />
              </View>
            ) : (
              <View style={styles.waitRow}>
                <Pill text={GROUP_LABEL[group]} color={GROUP_COLOR[group]} />
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: space.xs },
  title: { ...type.h1, color: colors.text },
  count: { ...type.small, color: colors.textMuted, marginTop: 3 },
  actionCard: { borderColor: colors.terra, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.terra,
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: space.md,
    ...elevation.soft,
  },
  nextText: { ...type.title, color: '#fff', fontSize: 15 },
  waitRow: { flexDirection: 'row', marginTop: space.sm },
});
