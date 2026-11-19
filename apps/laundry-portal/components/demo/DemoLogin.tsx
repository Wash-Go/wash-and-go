'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PasswordField } from '../auth/PasswordField';
import { TextField } from '../auth/TextField';
import { DEMO_EMAILS } from '../../lib/demo/fixture';
import { demoRoleFor } from '../../lib/demo/router';
import { getDemoRole, setDemoRole } from '../../lib/demo/runtime';
import { safeNext } from '../../lib/nav';

// Login for the standalone demo build: no Firebase. The owner email is
// prefilled; any password of 4+ characters signs in. The staff email signs
// in as staff.
export function DemoLogin() {
  const router = useRouter();
  const [next, setNext] = useState('/');
  const [email, setEmail] = useState<string>(DEMO_EMAILS.owner);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get('next')));
    if (getDemoRole()) router.replace('/');
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const role = demoRoleFor(email, pw);
    if (!role) {
      setErr(
        pw.length < 4
          ? 'Enter any password of 4 or more characters.'
          : `In the demo, sign in as ${DEMO_EMAILS.owner} or ${DEMO_EMAILS.staff}.`,
      );
      return;
    }
    setDemoRole(role);
    router.replace(next);
  }

  return (
    <main className="gate-wrap">
      <form className="gate" onSubmit={submit} noValidate data-testid="login">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <span className="chip chip-warn dev-chip" data-testid="demo-chip">
          Demo · nothing is sent anywhere
        </span>
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
            onValue={(v) => {
              setEmail(v);
              setErr(null);
            }}
            required
          />
          <PasswordField
            value={pw}
            onChange={(v) => {
              setPw(v);
              setErr(null);
            }}
            autoComplete="current-password"
            error={err}
            hint="Any password of 4 or more characters."
          />
        </div>
        <button type="submit" className="btn btn-primary full" disabled={!email.trim() || !pw}>
          Sign in
        </button>
        <button
          type="button"
          className="btn btn-text"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setNotice('Password reset is not available in the demo.')}
        >
          Forgot password?
        </button>
        {notice ? (
          <p className="notice notice-warn" role="status">
            {notice}
          </p>
        ) : null}
        <div className="small muted">
          Staff view: <span className="mono">{DEMO_EMAILS.staff}</span>
        </div>
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

// Signup in the demo build: explained, not available.
export function DemoSignup() {
  return (
    <main className="gate-wrap">
      <div className="gate" data-testid="demo-signup">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <h1 className="disp">Register your laundry</h1>
        <p className="notice notice-warn" role="status">
          Signing up is not available in the demo. Use the demo shop to look around.
        </p>
        <Link className="btn btn-primary full" href="/login">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
