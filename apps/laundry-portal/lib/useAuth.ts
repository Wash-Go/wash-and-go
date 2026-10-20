'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, DEV_UID } from './firebase';

// The demo build's session hook (lib/demo); dead code in every other build.
const useDemoAuth: (typeof import('./demo/useDemoAuth'))['useDemoAuth'] | null =
  process.env.NEXT_PUBLIC_DEMO === '1' ? require('./demo/useDemoAuth').useDemoAuth : null;

export type AuthState = {
  user: User | null;
  loading: boolean;
  devBypass: boolean;
  // x-dev-uid stub (dev/e2e) or the demo session; drives the cache owner key.
  devUid: string | undefined;
  // The sign-in email when there is no Firebase user (demo); else user.email.
  email: string | null;
  demo: boolean;
};

// Auth state for the UI. In dev/e2e (DEV_UID set) gating is bypassed entirely.
export function useAuth(): AuthState {
  // A build-time constant, so the hook order never changes at runtime.
  if (useDemoAuth) return useDemoAuth();
  return useFirebaseAuth();
}

function useFirebaseAuth(): AuthState {
  const [user, setUser] = useState<User | null>(process.env.NEXT_PUBLIC_DEMO === '1' ? null : auth.currentUser);
  const [loading, setLoading] = useState(!DEV_UID);

  useEffect(() => {
    if (DEV_UID) return; // dev bypass — no Firebase gating
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading, devBypass: !!DEV_UID, devUid: DEV_UID, email: user?.email ?? null, demo: false };
}
