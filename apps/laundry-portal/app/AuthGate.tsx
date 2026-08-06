'use client';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/useAuth';
import { c } from '../lib/theme';
import { LoginForm } from './LoginForm';

// Gates the whole console behind Firebase auth. In dev/e2e (DEV_UID set) it's a
// pass-through; in production an unauthenticated visitor sees the login form.
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, devBypass } = useAuth();

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
  if (!user) return <LoginForm />;
  return <>{children}</>;
}
