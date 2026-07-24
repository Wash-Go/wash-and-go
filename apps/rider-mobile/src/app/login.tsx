import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  H1,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  radius,
  space,
  type,
} from '@wash-and-go/ui';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

function friendly(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/user-disabled':
      return 'This account is disabled — contact ops.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Try again.';
  }
}

// Riders are provisioned by ops (a signed-in user is granted the RIDER role in
// the admin console) — sign-in only, no self-signup.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.includes('@') && password.length >= 6;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await api.postSession();
      router.replace('/');
    } catch (e) {
      setError(friendly((e as { code?: string })?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text style={{ fontSize: 40 }}>🛵</Text>
        <H1>Wash &amp; Go — Rider</H1>
        <Muted>Sign in to see your jobs.</Muted>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Sign in"
          onPress={submit}
          disabled={!valid}
          loading={busy}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: space.md, padding: space.md },
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
});
