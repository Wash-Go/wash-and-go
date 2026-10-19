'use client';
import { useQueryClient } from '@tanstack/react-query';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PasswordField } from '../../components/auth/PasswordField';
import { TextField } from '../../components/auth/TextField';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import {
  authErrorMessage,
  MIN_PASSWORD,
  profileSaveErrors,
  validateSignup,
  type SignupErrors,
} from '../../lib/auth-copy';
import { auth } from '../../lib/firebase';
import { sessionErrorMessage } from '../../lib/session';

// Register a laundry: Firebase account → POST /auth/session (DB user) →
// PATCH /auth/me (name + mobile) → POST /shop/onboarding/start (draft shop,
// SHOP_OWNER) → /onboarding. Each step is resumable: a retry after a later
// step failed reuses the account already created instead of creating another.
export default function SignupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validateSignup(form);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setErr(null);
    setBusy(true);
    const { name, email, password, phone } = v.value;
    try {
      // Firebase stores emails lower-cased; compare the same way so a retry
      // reuses the account this form already created.
      if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== email.toLowerCase()) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Staff invites need a verified email (B4a). Not blocking: signup goes
        // on, and the console's notice offers "Resend email".
        sendEmailVerification(cred.user).catch(() =>
          toast.show({
            tone: 'error',
            title: 'We couldn’t send the verification email.',
            body: 'You can resend it from the notice in your console.',
          }),
        );
      }
    } catch (ex) {
      setErr(authErrorMessage((ex as { code?: string })?.code, 'signup'));
      setBusy(false);
      return;
    }
    try {
      await api.postSession();
    } catch (ex) {
      setErr(sessionErrorMessage(ex));
      setBusy(false);
      return;
    }
    try {
      await api.updateMe({ name, phone });
    } catch (ex) {
      const r = profileSaveErrors(ex);
      if ('fields' in r) setErrors(r.fields);
      else setErr(r.general);
      setBusy(false);
      return;
    }
    try {
      await api.startShopOnboarding();
    } catch {
      setErr("Your account is made, but we couldn't start your registration. Try again.");
      setBusy(false);
      return;
    }
    await qc.invalidateQueries({ queryKey: ['boot'] });
    router.replace('/onboarding');
  }

  return (
    <main className="gate-wrap">
      <form className="gate" onSubmit={submit} noValidate data-testid="signup">
        <img className="lockup" src="/brand/logo-lockup-320.webp" alt="Wash & Go" width={93} height={56} />
        <div>
          <div className="lbl">Partner laundries</div>
          <h1 className="disp" style={{ marginTop: 6 }}>
            Register your laundry
          </h1>
          <p className="small muted" style={{ marginTop: 8 }}>
            Make your owner account first. Next you&rsquo;ll add your shop&rsquo;s details, and our team verifies it
            in person.
          </p>
        </div>
        <div>
          <TextField label="Your name" autoComplete="name" value={form.name} onValue={set('name')} error={errors.name} />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onValue={set('email')}
            error={errors.email}
          />
          <PasswordField
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            error={errors.password}
            hint={`At least ${MIN_PASSWORD} characters.`}
          />
          <TextField
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 123 4567"
            value={form.phone}
            onValue={set('phone')}
            error={errors.phone}
            hint="So our team can reach you about your shop."
          />
        </div>
        {err ? (
          <p className="field-error" role="alert" style={{ marginTop: -8 }}>
            {err}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary full" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
        <div className="gate-foot">
          <div className="small muted" style={{ marginBottom: 8 }}>
            Already registered?
          </div>
          <Link className="btn btn-secondary full" href="/login">
            Sign in
          </Link>
        </div>
      </form>
    </main>
  );
}
