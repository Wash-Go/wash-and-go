import { router, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, Text } from 'react-native';
import { formatPhMobile, type MeView } from '@wash-and-go/domain';
import {
  Card,
  Muted,
  PrimaryButton,
  Screen,
  colors,
  type,
  useToast,
} from '@wash-and-go/ui';
import { auth } from '../../lib/firebase';
import { api } from '../../lib/api';

export default function ProfileScreen() {
  const toast = useToast();
  const email = auth.currentUser?.email ?? null;
  // Name + mobile number; refreshed whenever the tab regains focus (e.g. back
  // from "Your details"). null = not loaded (or failed) — the card still opens
  // the edit screen, which loads and reports on its own.
  const [me, setMe] = useState<MeView | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      api
        .getMe()
        .then((m) => live && setMe(m))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );

  function doSignOut() {
    // The root auth gate redirects to /login once the user becomes null.
    signOut(auth).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Could not sign out.'),
    );
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
      <Card testID="your-details" onPress={() => router.push('/your-details')}>
        <Muted>Signed in as</Muted>
        {me ? (
          <>
            <Text style={[type.title, { color: colors.text }]}>
              {me.displayName || 'Add your name'}
            </Text>
            <Text style={[type.body, { color: me.phone ? colors.text : colors.textMuted }]}>
              {me.phone ? formatPhMobile(me.phone) : 'Add your mobile number'}
            </Text>
            <Muted>{email ?? '—'}</Muted>
          </>
        ) : (
          <Text style={[type.title, { color: colors.text }]}>{email ?? '—'}</Text>
        )}
      </Card>
      <Card testID="open-notifications" onPress={() => router.push('/notifications')}>
        <Text style={[type.title, { color: colors.text }]}>Notifications</Text>
        <Muted>Order updates and alerts.</Muted>
      </Card>
      <Card testID="manage-addresses" onPress={() => router.push('/addresses')}>
        <Text style={[type.title, { color: colors.text }]}>Saved addresses</Text>
        <Muted>Manage your pickup addresses for faster booking.</Muted>
      </Card>
      <Card>
        <Muted>Payment methods are coming soon.</Muted>
      </Card>
      <PrimaryButton label="Sign out" onPress={confirmSignOut} />
    </Screen>
  );
}
