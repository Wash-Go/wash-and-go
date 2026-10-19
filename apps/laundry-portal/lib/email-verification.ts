// Email verification notice (B3b §1b). The API accepts a staff invite only for
// a Firebase token with email_verified, so unverified password accounts see a
// dismissible notice with "Resend email" (once per 60 s) and "I've verified".

export const RESEND_COOLDOWN_MS = 60_000;
export const VERIFY_DISMISS_KEY = 'wg-portal-verify-dismissed';

export function shouldShowVerifyBanner(s: {
  devBypass: boolean;
  signedIn: boolean;
  email: string | null | undefined;
  emailVerified: boolean;
  dismissed: boolean;
}): boolean {
  // The dev x-dev-uid stub has no Firebase user and no email.
  if (s.devBypass || !s.signedIn || !s.email) return false;
  return !s.emailVerified && !s.dismissed;
}

// Seconds left before "Resend email" works again; 0 = can resend now.
export function resendWaitSeconds(lastSentAt: number | null, now: number): number {
  if (lastSentAt == null) return 0;
  const left = lastSentAt + RESEND_COOLDOWN_MS - now;
  return left > 0 ? Math.ceil(left / 1000) : 0;
}
