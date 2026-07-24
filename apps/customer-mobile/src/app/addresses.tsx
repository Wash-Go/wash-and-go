import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AddressView } from '@wash-and-go/domain';
import {
  Card,
  ErrorState,
  Loading,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  radius,
  space,
  type,
} from '@wash-and-go/ui';
import { api } from '../lib/api';

export default function AddressesScreen() {
  const [list, setList] = useState<AddressView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setList(await api.getAddresses());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your addresses.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async () => {
    const l = line.trim();
    if (l.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.createAddress({
        line: l,
        label: label.trim() || undefined,
        isDefault: (list?.length ?? 0) === 0, // first one is the default
      });
      setLabel('');
      setLine('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that address.');
    } finally {
      setBusy(false);
    }
  }, [line, label, busy, list, load]);

  const setDefault = useCallback(
    async (id: string) => {
      try {
        await api.updateAddress(id, { isDefault: true });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update that address.');
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.deleteAddress(id);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not remove that address.');
      }
    },
    [load],
  );

  if (!list && !error) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your addresses…" />
      </Screen>
    );
  }
  if (error && !list) {
    return (
      <Screen scroll={false}>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  const rows = list ?? [];

  return (
    <Screen>
      <Text style={styles.section}>Your pickup addresses</Text>
      {rows.length === 0 ? (
        <Muted>No saved addresses yet. Add one below for faster booking.</Muted>
      ) : (
        <View style={{ gap: space.sm }}>
          {rows.map((a) => (
            <Card key={a.id} testID={`address-${a.id}`}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  {a.label ? (
                    <Text style={[type.body, { color: colors.text, fontWeight: '700' }]}>
                      {a.label}
                    </Text>
                  ) : null}
                  <Muted>{a.line}</Muted>
                </View>
                {a.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeT}>Default</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.actions}>
                {!a.isDefault ? (
                  <Pressable
                    testID={`set-default-${a.id}`}
                    onPress={() => setDefault(a.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.linkNavy}>Set as default</Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable
                  testID={`remove-${a.id}`}
                  onPress={() => remove(a.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkDanger}>Remove</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text style={styles.section}>Add an address</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Label (e.g. Home, Office) — optional"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        testID="addr-label-input"
      />
      <TextInput
        value={line}
        onChangeText={setLine}
        placeholder="Address (street, barangay)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        testID="addr-line-input"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Add address"
        onPress={add}
        disabled={line.trim().length < 3}
        loading={busy}
        testID="add-address"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h2, color: colors.text, marginTop: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  linkNavy: { color: colors.navy, fontWeight: '700', ...type.small },
  linkDanger: { color: colors.danger, fontWeight: '700', ...type.small },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.danger, ...type.body },
  defaultBadge: {
    backgroundColor: colors.terra,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  defaultBadgeT: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});
