import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NotificationView } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  Loading,
  Muted,
  Screen,
  colors,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getNotifications();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = useCallback(
    async (n: NotificationView) => {
      if (!n.readAt) {
        api.markNotificationRead(n.id).catch(() => undefined);
        setItems((prev) =>
          prev
            ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
            : prev,
        );
      }
      if (n.orderId) router.push(`/orders/${n.orderId}`);
    },
    [],
  );

  const markAll = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch {
      // best-effort
    }
  }, [load]);

  if (!items && !error) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading notifications…" />
      </Screen>
    );
  }
  if (error && !items) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  const rows = items ?? [];
  const anyUnread = rows.some((n) => !n.readAt);

  return (
    <Screen>
      {anyUnread ? (
        <Pressable onPress={markAll} accessibilityRole="button" testID="mark-all-read">
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      ) : null}

      {rows.length === 0 ? (
        <Muted>No notifications yet. Order updates show up here.</Muted>
      ) : (
        <View style={{ gap: space.sm }}>
          {rows.map((n) => (
            <Card
              key={n.id}
              testID={`notification-${n.id}`}
              onPress={() => open(n)}
              style={{ backgroundColor: n.readAt ? colors.surface : colors.navyTint }}
            >
              <View style={styles.rowTop}>
                {!n.readAt ? <View style={styles.dot} /> : null}
                <Text style={[type.body, { color: colors.text, fontWeight: '700', flex: 1 }]}>
                  {n.title}
                </Text>
              </View>
              <Text style={[type.body, { color: colors.text }]}>{n.body}</Text>
              <Muted>{new Date(n.createdAt).toLocaleString()}</Muted>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { color: colors.navy, fontWeight: '700', ...type.small, textAlign: 'right' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.terra },
});
