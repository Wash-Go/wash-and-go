import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { STATUS_META, statusLabel, type OrderView } from '@wash-and-go/domain';
import {
  Card,
  EmptyState,
  ErrorState,
  H1,
  Loading,
  Muted,
  Pill,
  Screen,
  colors,
  space,
  toneColor,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';
import {
  actionLabel,
  GROUP_LABEL,
  jobGroup,
  sortJobs,
} from '../lib/triage';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; jobs: OrderView[] };

const GROUP_COLOR = {
  action: colors.brand,
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
          title="No jobs assigned"
          subtitle="You're all caught up. New pickups will appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>My jobs</H1>
      {state.jobs.map((j) => {
        const group = jobGroup(j);
        const next = j.availableActions?.[0];
        return (
          <Card key={j.id} onPress={() => router.push(`/orders/${j.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[type.title, { color: colors.text }]}>{j.code}</Text>
              <Pill text={statusLabel(j.status)} color={toneColor(STATUS_META[j.status].tone)} />
            </View>
            <Muted>{j.pickupAddress}</Muted>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
              <Pill text={GROUP_LABEL[group]} color={GROUP_COLOR[group]} />
              {group === 'action' && next ? (
                <Text style={[type.small, { color: colors.brand, fontWeight: '600' }]}>
                  → {actionLabel(next)}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
