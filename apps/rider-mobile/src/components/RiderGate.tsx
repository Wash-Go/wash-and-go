import { signOut } from 'firebase/auth';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  Loading,
  PrimaryButton,
  Screen,
  space,
  useToast,
} from '@wash-and-go/ui';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';
import {
  accessErrorMessage,
  gateCopy,
  loadRiderAccess,
  type RiderGate as GateVerdict,
} from '../lib/riderGate';

// Role + verification gate (U0 T5). The provider sits in the root layout and
// checks the signed-in account once (GET /auth/me + GET /rider/onboarding);
// <RiderGate> wraps every rider screen and only renders it for a VERIFIED
// rider. Everyone else gets a screen explaining why, with Sign out.

type Access =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; gate: GateVerdict; reason: string | null };

const LOADING: Access = { kind: 'loading' };

type RiderAccessContextValue = { access: Access; refresh: () => void };

const RiderAccessContext = createContext<RiderAccessContextValue>({
  access: LOADING,
  refresh: () => undefined,
});

// identity: the signed-in account (Firebase uid, or DEV_UID for the dev stub);
// null while signed out or still restoring. enabled: false on /login, where
// Firebase reports the user before POST /auth/session has created the DB row —
// the check waits until the login screen has navigated into the app.
export function RiderAccessProvider({
  identity,
  enabled,
  children,
}: {
  identity: string | null;
  enabled: boolean;
  children: React.ReactNode;
}) {
  // A verdict is tied to the account it was fetched for, so a previous
  // account's verdict (sign-out, then another sign-in) is never shown.
  const [state, setState] = useState<{ owner: string | null; access: Access }>({
    owner: null,
    access: LOADING,
  });
  // Only the latest request may write, so a slow response can't overwrite a
  // newer check (or land after sign-out).
  const latest = useRef(0);

  const load = useCallback((owner: string) => {
    const req = ++latest.current;
    setState({ owner, access: LOADING });
    loadRiderAccess(api).then(
      (a) => {
        if (req === latest.current) setState({ owner, access: { kind: 'ready', ...a } });
      },
      (e) => {
        console.warn('[rider gate] access check failed', e);
        if (req === latest.current) {
          setState({ owner, access: { kind: 'error', message: accessErrorMessage(e) } });
        }
      },
    );
  }, []);

  useEffect(() => {
    if (!identity) {
      // Signed out: drop the verdict and any in-flight check, so signing back
      // in (even as the same account) checks again.
      latest.current++;
      if (state.owner !== null) setState({ owner: null, access: LOADING });
      return;
    }
    if (enabled && state.owner !== identity) load(identity);
  }, [identity, enabled, state.owner, load]);

  const refresh = useCallback(() => {
    if (identity) load(identity);
  }, [identity, load]);

  const access = identity && state.owner === identity ? state.access : LOADING;
  const value = useMemo(() => ({ access, refresh }), [access, refresh]);
  return <RiderAccessContext.Provider value={value}>{children}</RiderAccessContext.Provider>;
}

const EMOJI: Record<Exclude<GateVerdict, 'ok'>, string> = {
  'not-rider': '🛵',
  'not-submitted': '📋',
  pending: '⏳',
  rejected: '📝',
};

export function RiderGate({ children }: { children: React.ReactNode }) {
  const { access, refresh } = useContext(RiderAccessContext);
  const toast = useToast();

  function doSignOut() {
    // The root layout sends a signed-out user to /login.
    signOut(auth).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Could not sign out.'),
    );
  }

  if (access.kind === 'loading') {
    return (
      <Screen scroll={false}>
        <Loading label="Checking your rider account…" />
      </Screen>
    );
  }
  if (access.kind === 'error') {
    return (
      <Screen scroll={false}>
        <ErrorState message={access.message} onRetry={refresh} />
        <SignOut onPress={doSignOut} />
      </Screen>
    );
  }

  const { gate, reason } = access;
  if (gate === 'ok') return <>{children}</>;

  const copy = gateCopy(gate, reason);
  if (!copy.refresh) {
    // Not a rider: nothing to wait for — Sign out is the only way forward.
    return (
      <Screen scroll={false}>
        <EmptyState
          emoji={EMOJI[gate]}
          title={copy.title}
          subtitle={copy.body}
          actionLabel="Sign out"
          onAction={doSignOut}
        />
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <EmptyState
        emoji={EMOJI[gate]}
        title={copy.title}
        subtitle={copy.body}
        actionLabel="Check again"
        onAction={refresh}
      />
      <SignOut onPress={doSignOut} />
    </Screen>
  );
}

// Secondary Sign out under a centred state: same width as the state's own
// button, lifted off the bottom edge (Screen has no bottom safe-area inset).
function SignOut({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.signOut}>
      <PrimaryButton label="Sign out" onPress={onPress} testID="gate-sign-out" />
    </View>
  );
}

const styles = StyleSheet.create({
  signOut: { paddingHorizontal: space.xl, paddingBottom: space.xl },
});
