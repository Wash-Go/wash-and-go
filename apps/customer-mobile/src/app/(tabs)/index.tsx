import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isTerminal, STATUS_META, statusLabel, type OrderView } from '@wash-and-go/domain';
import {
  Card,
  Eyebrow,
  Muted,
  Pill,
  Screen,
  colors,
  elevation,
  font,
  radius,
  space,
  toneColor,
  type,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

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
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>{greeting().toUpperCase()}</Text>
        <Text style={styles.heroTitle}>Fresh laundry,{'\n'}zero effort.</Text>
        <View style={styles.heroTag}>
          <View style={styles.heroDot} />
          <Text style={styles.heroTagText}>Express pickup · same day</Text>
        </View>
      </View>

      {/* Primary CTA — nested icon island (button-in-button) */}
      <Pressable
        onPress={() => router.push('/book')}
        accessibilityRole="button"
        accessibilityLabel="Book a wash"
        style={({ pressed }) => [styles.cta, elevation.terra, pressed && styles.ctaPressed]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Book a wash</Text>
          <Text style={styles.ctaSub}>Pick a load, we handle the rest</Text>
        </View>
        <View style={styles.ctaIcon}>
          <Feather name="arrow-up-right" size={22} color="#fff" />
        </View>
      </Pressable>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickTile icon="calendar" label="Schedule" onPress={() => router.push('/book')} />
        <QuickTile icon="rotate-ccw" label="Reorder" onPress={() => router.push('/orders')} />
      </View>

      {/* Active order */}
      <View style={{ marginTop: space.sm }}>
        <Eyebrow>Active order</Eyebrow>
      </View>
      {active === undefined ? (
        <Card>
          <Muted>Loading…</Muted>
        </Card>
      ) : active ? (
        <Card onPress={() => router.push(`/orders/${active.id}`)} style={styles.orderCard}>
          <View style={styles.orderRow}>
            <View style={styles.orderIcon}>
              <Feather name="package" size={18} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: colors.text }]}>{active.code}</Text>
              <Muted>{active.pickupAddress}</Muted>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textFaint} />
          </View>
          <View style={styles.orderFoot}>
            <Pill
              text={statusLabel(active.status)}
              color={toneColor(STATUS_META[active.status].tone)}
            />
          </View>
        </Card>
      ) : (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="inbox" size={22} color={colors.textFaint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: colors.text }]}>No active orders</Text>
            <Muted>Book a wash and it’ll show up here.</Muted>
          </View>
        </Card>
      )}
    </Screen>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.tileIcon}>
        <Feather name={icon} size={18} color={colors.navy} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: space.xl,
    paddingVertical: 26,
    overflow: 'hidden',
    ...elevation.hero,
  },
  heroGlow: {
    position: 'absolute',
    right: -46,
    top: -46,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.navyDark,
    opacity: 0.6,
  },
  heroEyebrow: { ...type.label, color: colors.terra, marginBottom: 10 },
  heroTitle: { ...type.hero, color: '#fff', fontSize: 28, lineHeight: 32 },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terra },
  heroTagText: { ...type.small, color: colors.onNavy },

  cta: {
    backgroundColor: colors.terra,
    borderRadius: radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaPressed: { transform: [{ scale: 0.98 }] },
  ctaTitle: { ...type.h2, color: '#fff' },
  ctaSub: { ...type.small, color: '#fbe7d4', marginTop: 2 },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickRow: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    padding: space.lg,
    gap: 10,
    ...elevation.soft,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { ...type.title, color: colors.text },

  orderCard: { gap: space.md },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderFoot: { flexDirection: 'row', alignItems: 'center' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
