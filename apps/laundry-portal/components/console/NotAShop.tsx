'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { useConsole } from './ConsoleContext';

// B9: a customer (or rider) account signed in to the partner console. A clear
// way out, mirroring the rider gate. "Register your laundry" turns this same
// account into a shop owner with a draft shop (POST /shop/onboarding/start).
export function NotAShop() {
  const { email, me, signOut } = useConsole();
  const kind = me.roles.includes('CUSTOMER') ? 'a customer account' : 'not a partner laundry account';
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function register() {
    setBusy(true);
    setErr(null);
    try {
      await api.startShopOnboarding();
      await qc.invalidateQueries({ queryKey: ['boot'] });
    } catch {
      setErr("We couldn't start your registration. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className="gate-wrap">
      <div className="gate" data-testid="not-a-shop">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <h1 className="disp" style={{ marginTop: 12 }}>
          This console is for partner laundries
        </h1>
        <p>
          You&rsquo;re signed in as <b>{email ?? 'this account'}</b>, {kind}. To book laundry, use the
          Wash &amp; Go app.
        </p>
        <p className="small muted">
          Own a laundry in Zamboanga City? Register it and our team will verify it in person.
        </p>
        {err ? (
          <p className="field-error" role="alert">
            {err}
          </p>
        ) : null}
        <Button full onClick={() => void register()} disabled={busy}>
          {busy ? 'Starting…' : 'Register your laundry'}
        </Button>
        <Button full variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
