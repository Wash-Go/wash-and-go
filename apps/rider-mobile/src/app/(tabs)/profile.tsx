import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import type { RiderProfileView } from '@wash-and-go/domain';
import {
  Card,
  Muted,
  Pill,
  PrimaryButton,
  Screen,
  colors,
  space,
  type,
  useToast,
} from '@wash-and-go/ui';
import { api } from '../../lib/api';
import { auth, DEV_UID } from '../../lib/firebase';

// Verification status → label + colour for the badge.
const STATUS: Record<string, { label: string; color: string }> = {
  VERIFIED: { label: 'Verified rider', color: colors.success },
  SUBMITTED: { label: 'Verification pending', color: colors.warning },
  DRAFT: { label: 'Not submitted', color: colors.textMuted },
  REJECTED: { label: 'Rejected', color: colors.danger },
};

export default function ProfileScreen() {
  const toast = useToast();
  const name = auth.currentUser?.displayName ?? auth.currentUser?.email ?? DEV_UID ?? 'Rider';
  const [profile, setProfile] = useState<RiderProfileView | null>(null);

  useEffect(() => {
    // Best-effort — the screen is useful even if this fails.
    api.getMyRiderOnboarding().then(setProfile).catch(() => setProfile(null));
  }, []);

  function doSignOut() {
    // The root auth gate redirects to /login once the user becomes null.
    signOut(auth).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Could not sign out.'),
    );
  }

  function confirmSignOut() {
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

  const status = profile ? STATUS[profile.status] : null;

  return (
    <Screen>
      <Card>
        <Muted>Signed in as</Muted>
        <Text style={[type.title, { color: colors.text, marginTop: 2 }]}>{name}</Text>
        {status ? (
          <View style={{ flexDirection: 'row', marginTop: space.sm }}>
            <Pill text={status.label} color={status.color} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Muted>Payouts and support are coming soon.</Muted>
      </Card>

      <PrimaryButton label="Sign out" onPress={confirmSignOut} testID="sign-out" />
    </Screen>
  );
}
