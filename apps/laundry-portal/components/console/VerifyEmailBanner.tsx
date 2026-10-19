'use client';
import '../onboarding/onboarding.css';
import { sendEmailVerification } from 'firebase/auth';
import { MailWarning, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { resendWaitSeconds, shouldShowVerifyBanner, VERIFY_DISMISS_KEY } from '../../lib/email-verification';
import { useNow } from '../../lib/live';
import { useAuth } from '../../lib/useAuth';
import { useConsole } from './ConsoleContext';

const SENT_KEY = 'wg-portal-verify-sent';

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// "Verify your email" notice (B3b §1b). A staff invite is accepted only for a
// verified email, and Firebase password accounts start unverified. Dismissal
// lasts for this browser session. Hidden in the dev x-dev-uid stub.
// Mounted once from the console layout (placement "shell") and once inside
// the onboarding page under its header (placement "onboarding").
export function VerifyEmailBanner({ placement = 'shell' }: { placement?: 'shell' | 'onboarding' }) {
  const { user, devBypass } = useAuth();
  const { refresh } = useConsole();
  const pathname = usePathname();
  const toast = useToast();
  const now = useNow();
  const [dismissed, setDismissed] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setDismissed(session()?.getItem(VERIFY_DISMISS_KEY) === '1');
    const s = Number(local()?.getItem(SENT_KEY));
    if (Number.isFinite(s) && s > 0) setSentAt(s);
  }, []);

  const onOnboarding = pathname === '/onboarding';
  if ((placement === 'shell') === onOnboarding) return null;
  const show = shouldShowVerifyBanner({
    devBypass,
    signedIn: !!user,
    email: user?.email,
    emailVerified: verified || !!user?.emailVerified,
    dismissed,
  });
  if (!show || !user) return null;

  const wait = resendWaitSeconds(sentAt, now || Date.now());

  async function resend() {
    if (!user || resendWaitSeconds(sentAt, Date.now()) > 0) return;
    const at = Date.now();
    setSentAt(at);
    try {
      local()?.setItem(SENT_KEY, String(at));
    } catch {
      /* per-device convenience only */
    }
    try {
      await sendEmailVerification(user);
      toast.show({ title: 'Email sent.', body: `Open the link we sent to ${user.email}.` });
    } catch {
      toast.show({ tone: 'error', title: 'We couldn’t send the email.', body: 'Try again in a minute.' });
    }
  }

  async function checkVerified() {
    if (!user || checking) return;
    setChecking(true);
    try {
      await user.reload();
      if (!user.emailVerified) {
        toast.show({
          tone: 'error',
          title: 'Not verified yet.',
          body: 'Open the link in the email we sent, then tap “I’ve verified” again.',
        });
        return;
      }
      // A fresh token carries email_verified; re-posting the session lets the
      // API see it (and an open staff invite can then be accepted).
      await user.getIdToken(true);
      await api.postSession();
      setVerified(true);
      toast.show({ title: 'Email verified.' });
      await refresh();
    } catch {
      toast.show({ tone: 'error', title: 'We couldn’t check right now.', body: 'Check your connection, then try again.' });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="top-notice notice-warn" role="region" aria-label="Verify your email" data-testid="verify-email">
      <MailWarning aria-hidden="true" />
      <div className="top-notice-body">
        <b>Verify your email to accept staff invites and keep your account safe.</b>
        <div className="row">
          <button type="button" className="btn btn-text" onClick={() => void resend()} disabled={wait > 0}>
            {wait > 0 ? `Resend in ${wait} s` : 'Resend email'}
          </button>
          <button type="button" className="btn btn-text" onClick={() => void checkVerified()} disabled={checking}>
            {checking ? 'Checking…' : 'I’ve verified'}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="icon-close"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            session()?.setItem(VERIFY_DISMISS_KEY, '1');
          } catch {
            /* ignore */
          }
        }}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
