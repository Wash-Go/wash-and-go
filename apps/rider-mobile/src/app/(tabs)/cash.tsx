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
import { api } from '../../lib/api';

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
        {b.capPhp ? (
          <Text
            style={[
              styles.sub,
              owed >= Number(b.capPhp) ? { color: colors.terra, fontWeight: '700' } : null,
            ]}
          >
            {owed >= Number(b.capPhp)
              ? `Over the ${peso(b.capPhp)} limit — deposit to resume taking jobs`
              : `New jobs pause once you owe ${peso(b.capPhp)}`}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[type.title, { color: colors.text }]}>How payments work</Text>
        <View style={{ gap: 6, marginTop: space.xs }}>
          <Text style={styles.li}>
            1. You collect cash from the customer on delivery (COD). That money is
            the platform's — you're holding it for us.
          </Text>
          <Text style={styles.li}>
            2. Deposit it back via GCash or hand it to ops. Each deposit shows in
            your history below and lowers what you owe.
          </Text>
          <Text style={styles.li}>
            3. Your delivery earnings are settled separately every week.
          </Text>
          <Text style={[styles.li, { color: colors.terraDark }]}>
            Heads up: if what you owe climbs too high, new jobs pause until you
            deposit. Keeps balances safe for everyone.
          </Text>
        </View>
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
  li: { ...type.body, color: colors.textMuted, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
