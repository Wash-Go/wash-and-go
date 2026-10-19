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
  useToast,
} from '@wash-and-go/ui';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';
import { PHONE_HINT, profileSaveErrorMessage, validateContact } from '../lib/profile';

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
  // Sign-up only (U0 T4): the rider calls this number at pickup.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const signup = mode === 'signup';
  const contact = validateContact({ name, phone });
  const credsValid = email.includes('@') && password.length >= 6;
  const valid = credsValid && (!signup || contact.ok);
  const phoneHint = signup && phone.trim() !== '' && !contact.ok && contact.errors.phone;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      if (signup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Create/refresh the Postgres user (defaults to CUSTOMER).
      await api.postSession();
    } catch (e) {
      toast.error(friendly((e as { code?: string })?.code));
      setBusy(false);
      return;
    }
    if (signup && contact.ok) {
      try {
        await api.updateMe({ name: contact.name, phone: contact.phone });
      } catch (e) {
        // The account exists and is signed in; only the details didn't save.
        // Booking asks for the number again, so let them in and say so.
        toast.error(`${profileSaveErrorMessage(e)} You can add it before you book.`);
      }
    }
    setBusy(false);
    router.replace('/');
  }

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text style={{ fontSize: 40 }}>🧺</Text>
        <H1>Wash &amp; Go</H1>
        <Muted>
          {mode === 'signin' ? 'Sign in to book a wash.' : 'Create your account.'}
        </Muted>

        {signup ? (
          <>
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
              testID="signup-name"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile number (0917 123 4567)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={20}
              style={styles.input}
              testID="signup-phone"
            />
            {phoneHint ? <Muted>{PHONE_HINT}</Muted> : null}
          </>
        ) : null}

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

        <PrimaryButton
          label={mode === 'signin' ? 'Sign in' : 'Create account'}
          onPress={submit}
          disabled={!valid}
          loading={busy}
        />

        <Pressable
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
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
});
