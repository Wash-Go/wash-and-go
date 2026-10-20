'use client';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PasswordField } from '../../components/auth/PasswordField';
import { TextField } from '../../components/auth/TextField';
import { api } from '../../lib/api';
import { authErrorMessage, resetPasswordCopy } from '../../lib/auth-copy';
import { auth, DEV_UID } from '../../lib/firebase';
import { safeNext } from '../../lib/nav';
import { sessionAfterSignIn } from '../../lib/session';
import { useAuth } from '../../lib/useAuth';

// B1 login (preview B1): lockup, email, password with show/hide, an inline
// human error, Forgot password (Firebase reset email), Register your laundry.
function LoginScreen() {
  const router = useRouter();
  // Read ?next= after mount, not with useSearchParams: that hook opts the
  // whole page out of static rendering, so the HTML arrived empty and the
  // headline painted only after the JS (a slow LCP on mobile).
  const [next, setNext] = useState('/');
  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get('next')));
  }, []);
  const { user, loading, devBypass } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // While a sign-in is in flight Firebase reports the user before the DB
  // session exists; only an already-signed-in visitor is redirected.
  const submitting = useRef(false);

  useEffect(() => {
    if (!loading && user && !submitting.current) router.replace(next);
  }, [loading, user, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    submitting.current = true;
    setBusy(true);
    setErr(null);
    setResetMsg(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (ex) {
      setErr(authErrorMessage((ex as { code?: string })?.code, 'signin'));
      setBusy(false);
      submitting.current = false;
      return;
    }
    // No DB user → every API call 401s, so a failure keeps the form up (signed
    // back out of Firebase) with the reason.
    const res = await sessionAfterSignIn(auth.currentUser, api, () => signOut(auth));
    if (res.ok) {
      router.replace(next);
      return;
    }
    setErr(res.message);
    setBusy(false);
    submitting.current = false;
  }

  async function forgot() {
    setErr(null);
    const to = email.trim();
    if (!to) {
      setResetMsg({ ok: false, text: resetPasswordCopy({ ok: false, code: 'auth/missing-email' }, to) });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, to);
      setResetMsg({ ok: true, text: resetPasswordCopy({ ok: true }, to) });
    } catch (ex) {
      const code = (ex as { code?: string })?.code;
      setResetMsg({ ok: code === 'auth/user-not-found', text: resetPasswordCopy({ ok: false, code }, to) });
    }
  }

  return (
    <main className="gate-wrap">
      <form className="gate" onSubmit={submit} noValidate data-testid="login">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        {devBypass ? (
          <span className="chip chip-warn dev-chip">Dev stub: signed in as {DEV_UID}</span>
        ) : null}
        <div>
          <div className="lbl">Partner laundries</div>
          <h1 className="disp" style={{ marginTop: 6 }}>
            Sign in to your shop
          </h1>
        </div>
        <div>
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onValue={setEmail}
            required
          />
          <PasswordField value={pw} onChange={setPw} autoComplete="current-password" error={err} />
        </div>
        <button type="submit" className="btn btn-primary full" disabled={busy || !email.trim() || !pw}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" className="btn btn-text" style={{ alignSelf: 'flex-start' }} onClick={() => void forgot()}>
          Forgot password?
        </button>
        {resetMsg ? (
          <p className={`notice ${resetMsg.ok ? 'notice-ok' : 'notice-warn'}`} role="status">
            {resetMsg.text}
          </p>
        ) : null}
        {devBypass ? (
          <Link className="btn btn-secondary full" href={next}>
            Open the console (dev stub)
          </Link>
        ) : null}
        <div className="gate-foot">
          <div className="small muted" style={{ marginBottom: 8 }}>
            New partner laundry?
          </div>
          <Link className="btn btn-secondary full" href="/signup">
            Register your laundry
          </Link>
        </div>
      </form>
    </main>
  );
}

// The standalone demo build (NEXT_PUBLIC_DEMO=1) signs in without Firebase.
const DemoLogin: (typeof import('../../components/demo/DemoLogin'))['DemoLogin'] | null =
  process.env.NEXT_PUBLIC_DEMO === '1' ? require('../../components/demo/DemoLogin').DemoLogin : null;

export default function LoginPage() {
  return DemoLogin ? <DemoLogin /> : <LoginScreen />;
}
