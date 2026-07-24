import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RiderCashDetail } from '@wash-and-go/domain';
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

export default function CashScreen() {
  const [data, setData] = useState<RiderCashDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.getMyCash());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your cash.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your cash…" />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  const b = data!.balance;
  const owed = Number(b.outstandingPhp);

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.navyTint }}>
        <Muted>Outstanding — cash you still owe the platform</Muted>
        <Text
          style={[
            type.hero,
            { color: owed > 0 ? colors.terra : colors.text, marginTop: space.xs },
          ]}
        >
          {peso(b.outstandingPhp)}
        </Text>
        <Text style={styles.sub}>
          Collected {peso(b.collectedPhp)} · Deposited {peso(b.depositedPhp)}
        </Text>
      </Card>

      <Text style={styles.section}>Deposit history</Text>
      {data!.deposits.length === 0 ? (
        <Muted>No deposits recorded yet.</Muted>
      ) : (
        <View style={{ gap: space.sm }}>
          {data!.deposits.map((d) => (
            <Card key={d.id}>
              <View style={styles.rowBetween}>
                <Text style={[type.title, { color: colors.text }]}>{peso(d.amountPhp)}</Text>
                <Muted>{new Date(d.createdAt).toLocaleDateString()}</Muted>
              </View>
              {d.reference ? <Muted>Ref: {d.reference}</Muted> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h2, color: colors.text, marginTop: space.md },
  sub: { ...type.small, color: colors.textMuted, marginTop: space.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
