'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { c } from '../lib/theme';

function mapErr(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/user-disabled':
      return 'This account is disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again later.';
    default:
      return 'Could not sign in. Try again.';
  }
}

// Full-screen sign-in shown by AuthGate when no one is signed in (prod). Admins
// are provisioned — sign-in only, no self-signup.
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (ex) {
      setErr(mapErr((ex as { code?: string })?.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: c.bg,
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        className="card"
        style={{ width: '100%', maxWidth: 360, padding: 28 }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Wash &amp; Go — Admin</h1>
        <p style={{ color: c.muted, marginTop: 6, marginBottom: 20, fontSize: 14 }}>
          Sign in to the admin console.
        </p>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          className="field-input"
          style={{ width: '100%', marginBottom: 14 }}
          required
        />
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          className="field-input"
          style={{ width: '100%', marginBottom: 18 }}
          required
        />
        {err ? (
          <p style={{ color: c.danger, fontSize: 13, marginTop: 0, marginBottom: 14 }}>{err}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !email || !pw}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: 'none',
            background: busy || !email || !pw ? c.border : c.brand,
            color: busy || !email || !pw ? c.muted : '#fff',
            fontWeight: 700,
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
