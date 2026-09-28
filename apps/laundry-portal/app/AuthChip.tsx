'use client';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

export function AuthChip() {
  const { user, devBypass } = useAuth();
  if (devBypass || !user) return <span className="role-chip">Shop console</span>;
  return (
    <span className="role-chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {user.email}
      <button
        onClick={() => signOut(auth)}
        style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, padding: 0 }}
      >
        Sign out
      </button>
    </span>
  );
}
