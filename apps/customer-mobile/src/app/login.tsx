import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
    case 'auth/email-already-in-use':
      return 'That email already has an account — sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Try again.';
  }
}

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
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
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Create/refresh the Postgres user (defaults to CUSTOMER).
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
        <Text style={{ fontSize: 40 }}>🧺</Text>
        <H1>Wash &amp; Go</H1>
        <Muted>
          {mode === 'signin' ? 'Sign in to book a wash.' : 'Create your account.'}
        </Muted>

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
          placeholder="Password (min 6)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={mode === 'signin' ? 'Sign in' : 'Create account'}
          onPress={submit}
          disabled={!valid}
          loading={busy}
        />

        <Pressable
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          style={{ padding: space.md }}
        >
          <Text style={{ color: colors.brand, fontWeight: '600' }}>
            {mode === 'signin'
              ? 'New here? Create an account'
              : 'Have an account? Sign in'}
          </Text>
        </Pressable>
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
