'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { api } from '../lib/api';
import { ensureSession } from '../lib/session';
import { useAuth } from '../lib/useAuth';
import { c } from '../lib/theme';
import { LoginForm } from './LoginForm';

// Restore: Firebase brought back a persisted session on page load (the first
// auth state). Make sure the DB user exists without blocking the console — a
// failure is logged and toasted, not a sign-out; the next API call surfaces any
// auth error normally. Fresh sign-ins go through LoginForm instead.
function useRestoredSession(user: User | null, loading: boolean, devBypass: boolean) {
  const checked = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (devBypass || loading || checked.current) return;
    checked.current = true;
    if (!user) return;
    void ensureSession(user, api).then((r) => {
      if (r.ok) return;
      console.error('[auth] POST /auth/session failed for the restored session', r.error);
      setNotice(r.message);
    });
  }, [user, loading, devBypass]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  return notice;
}

// Gates the whole console behind Firebase auth. In dev/e2e (DEV_UID set) it's a
// pass-through; in production an unauthenticated visitor sees the login form.
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, devBypass } = useAuth();
  // Firebase reports the user as soon as the password checks out, but the
  // console must not open until POST /auth/session has created the DB user.
  // LoginForm holds the gate from submit and releases it only on success, so a
  // session failure stays on the form.
  const [held, setHeld] = useState(false);
  const notice = useRestoredSession(user, loading, devBypass);

  if (devBypass) return <>{children}</>;
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.muted,
        }}
      >
        Loading…
      </div>
    );
  }
  if (!user || held) {
    return <LoginForm onSubmitStart={() => setHeld(true)} onSignedIn={() => setHeld(false)} />;
  }
  return (
    <>
      {children}
      {notice ? (
        <div className="toast" role="alert">
          {notice}
        </div>
      ) : null}
    </>
  );
}
