'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, DEV_UID } from './firebase';

// Auth state for the UI. In dev/e2e (DEV_UID set) gating is bypassed entirely.
export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!DEV_UID);

  useEffect(() => {
    if (DEV_UID) return; // dev bypass — no Firebase gating
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading, devBypass: !!DEV_UID };
}
