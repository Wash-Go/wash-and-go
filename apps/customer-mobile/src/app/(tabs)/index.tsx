import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isTerminal, STATUS_META, statusLabel, type OrderView } from '@wash-and-go/domain';
import {
  Card,
  Muted,
  Pill,
  Screen,
  colors,
  radius,
  space,
  toneColor,
  type,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';

export default function HomeScreen() {
  // undefined = loading, null = none
  const [active, setActive] = useState<OrderView | null | undefined>(undefined);

  useEffect(() => {
    api
      .listOrders()
      .then((os) => setActive(os.find((o) => !isTerminal(o.status)) ?? null))
      .catch(() => setActive(null));
  }, []);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.hi}>GOOD MORNING</Text>
        <Text style={styles.big}>Ready when{'\n'}you are.</Text>
      </View>

      <Pressable
        onPress={() => router.push('/book')}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
      >
        <View>
          <Text style={styles.ctaT}>Book a wash</Text>
          <Text style={styles.ctaS}>Express pickup · same day</Text>
        </View>
        <View style={styles.cicon}>
          <Text style={styles.plus}>+</Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <QuickTile label="Schedule" onPress={() => router.push('/book')} />
        <QuickTile label="Reorder" onPress={() => router.push('/orders')} />
      </View>

      <Text style={styles.eyebrow}>Active order</Text>
      {active === undefined ? (
        <Card>
          <Muted>Loading…</Muted>
        </Card>
      ) : active ? (
        <Card onPress={() => router.push(`/orders/${active.id}`)}>
          <View style={styles.rowBetween}>
            <Text style={[type.title, { color: colors.text }]}>{active.code}</Text>
            <Pill text={statusLabel(active.status)} color={toneColor(STATUS_META[active.status].tone)} />
          </View>
          <Muted>{active.pickupAddress}</Muted>
        </Card>
      ) : (
        <Card>
          <Muted>No active orders. Book a wash to get started.</Muted>
        </Card>
      )}
    </Screen>
  );
}

function QuickTile({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
    >
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 18 },
  hi: { color: '#e7b98a', fontSize: 11, letterSpacing: 1.6, fontWeight: '700' },
  big: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 6, lineHeight: 28 },
  cta: {
    backgroundColor: colors.terra,
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ctaS: { color: '#f8e2cd', fontSize: 12, marginTop: 2 },
  cicon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: '#fff', fontSize: 24, fontWeight: '800' },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tileLabel: { color: colors.text, fontWeight: '600', fontSize: 14 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: colors.terraDark,
    marginTop: space.xs,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
