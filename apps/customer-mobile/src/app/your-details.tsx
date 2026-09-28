import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { formatPhMobile } from '@wash-and-go/domain';
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
  useToast,
} from '@wash-and-go/ui';
import { api } from '../lib/api';
import { PHONE_HINT, profileSaveErrorMessage, validateContact } from '../lib/profile';

// Name + mobile number (U0 T4). Opened from Profile to edit, and by the
// checkout gate (`?gate=1`) when an account has no number yet — the rider calls
// this number at pickup.
export default function YourDetailsScreen() {
  const { gate } = useLocalSearchParams<{ gate?: string }>();
  const fromBooking = gate === '1';
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const me = await api.getMe();
      setName(me.displayName);
      setPhone(me.phone ? formatPhMobile(me.phone) : '');
      setLoaded(true);
    } catch (e) {
      setLoadError(profileSaveErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contact = validateContact({ name, phone });
  const phoneHint = phone.trim() !== '' && !contact.ok && contact.errors.phone;

  async function save() {
    if (!contact.ok || busy) return;
    setBusy(true);
    try {
      await api.updateMe({ name: contact.name, phone: contact.phone });
      toast.success(
        fromBooking ? 'Number saved — now confirm your booking.' : 'Details saved.',
      );
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch (e) {
      toast.error(profileSaveErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Screen scroll={false}>
        <ErrorState message={loadError} onRetry={load} />
      </Screen>
    );
  }
  if (!loaded) {
    return (
      <Screen scroll={false}>
        <Loading label="Loading your details…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={[type.title, { color: colors.text }]}>
          {fromBooking ? 'Add your mobile number' : 'Your details'}
        </Text>
        <Muted>Your rider calls this number at pickup and delivery.</Muted>
      </Card>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        style={styles.input}
        testID="details-name"
      />

      <Text style={styles.label}>Mobile number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="0917 123 4567"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={20}
        style={styles.input}
        testID="details-phone"
      />
      {phoneHint ? <Muted>{PHONE_HINT}</Muted> : null}

      <PrimaryButton
        label={fromBooking ? 'Save and continue' : 'Save'}
        onPress={save}
        disabled={!contact.ok || busy}
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { ...type.small, color: colors.textMuted, fontWeight: '700', marginTop: space.xs },
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
});
