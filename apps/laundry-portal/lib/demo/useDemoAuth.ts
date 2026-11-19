'use client';
import { useEffect, useState } from 'react';
import { demoEmailFor, getDemoRole, subscribeDemoRole } from './runtime';
import type { DemoRole } from './router';

// useAuth for the demo build: the demo session stands in for Firebase.
// loading until mounted, so a stored session is read before the gate decides.
export function useDemoAuth() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const read = () => setRole(getDemoRole());
    read();
    setLoading(false);
    return subscribeDemoRole(read);
  }, []);
  return {
    user: null,
    loading,
    devBypass: !!role,
    devUid: role ? `demo-${role}` : undefined,
    email: demoEmailFor(role),
    demo: true as const,
  };
}
