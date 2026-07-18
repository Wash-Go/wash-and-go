import { signOut } from 'firebase/auth';
import React from 'react';
import { Alert, Platform, Text } from 'react-native';
import {
  Card,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  type,
} from '@wash-and-go/ui';
import { auth } from '../../lib/firebase';

export default function ProfileScreen() {
  const email = auth.currentUser?.email ?? null;

  function doSignOut() {
    // The root auth gate redirects to /login once the user becomes null.
    void signOut(auth);
  }

  function confirmSignOut() {
    // react-native-web's Alert has no buttons — use window.confirm on web.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Sign out of Wash & Go?')) {
        doSignOut();
      }
      return;
    }
    Alert.alert('Sign out', 'Sign out of Wash & Go?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Muted>Signed in as</Muted>
        <Text style={[type.title, { color: colors.text }]}>{email ?? '—'}</Text>
      </Card>
      <Card>
        <Muted>
          Saved addresses, payment methods, and notifications are coming soon.
        </Muted>
      </Card>
      <PrimaryButton label="Sign out" onPress={confirmSignOut} />
    </Screen>
  );
}
