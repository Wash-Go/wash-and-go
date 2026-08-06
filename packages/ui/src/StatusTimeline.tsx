import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  EXPRESS_TIMELINE,
  OrderStatus,
  STATUS_META,
} from '@wash-and-go/domain';
import { colors, space, type } from './theme';

// Vertical progress rail. Current step is the hero; completed filled, upcoming
// muted. CANCELLED is a distinct terminal row.
export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <View style={styles.cancelRow}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={[type.title, { color: colors.danger }]}>Cancelled</Text>
      </View>
    );
  }

  const current = STATUS_META[status].step;

  return (
    <View>
      {EXPRESS_TIMELINE.map((s, i) => {
        const meta = STATUS_META[s];
        const done = meta.step <= current;
        const isCurrent = meta.step === current;
        const last = i === EXPRESS_TIMELINE.length - 1;
        return (
          <View key={s} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.brand : colors.border,
                    transform: [{ scale: isCurrent ? 1.35 : 1 }],
                  },
                ]}
              />
              {!last ? (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: meta.step < current ? colors.brand : colors.border },
                  ]}
                />
              ) : null}
            </View>
            <Text
              style={[
                isCurrent ? type.title : type.body,
                {
                  color: isCurrent
                    ? colors.text
                    : done
                      ? colors.textMuted
                      : colors.border,
                  marginBottom: space.md,
                },
              ]}
            >
              {meta.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  connector: { width: 2, flex: 1, marginVertical: 2 },
  cancelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
