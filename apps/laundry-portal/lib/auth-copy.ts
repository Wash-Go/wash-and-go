import { normalizePhMobile } from '@wash-and-go/domain';

// Human copy for Firebase auth failures and the sign-up form rules. Pure: no
// firebase imports, so it runs under the node jest config. Raw codes and
// server text are never shown.

export type AuthContext = 'signin' | 'signup';

const NETWORK = "Can't reach the sign-in service. Check your connection and try again.";

export function authErrorMessage(code: string | undefined, ctx: AuthContext): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email looks incomplete. Check it and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That password doesn't match this email. Try again, or reset it below.";
    case 'auth/user-disabled':
      return 'This account is switched off. Contact the Wash & Go team to turn it back on.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute, then try again.';
    case 'auth/network-request-failed':
      return NETWORK;
    case 'auth/email-already-in-use':
      return 'That email already has an account. Sign in instead.';
    case 'auth/weak-password':
      return 'Use a password with at least 8 characters.';
    default:
      return ctx === 'signup'
        ? "We couldn't create your account. Try again in a moment."
        : "We couldn't sign you in. Try again in a moment.";
  }
}

// Forgot password. The same confirmation shows whether or not the account
// exists, so the form never reveals which emails have accounts.
export function resetPasswordCopy(
  result: { ok: true } | { ok: false; code?: string },
  email: string,
): string {
  const sent = `If ${email} has an account, a reset link is on its way. Check your inbox and spam folder.`;
  if (result.ok) return sent;
  switch (result.code) {
    case 'auth/missing-email':
      return 'Type your email above first, then tap Forgot password.';
    case 'auth/invalid-email':
      return 'That email looks incomplete. Check it and try again.';
    case 'auth/user-not-found':
      return sent;
    case 'auth/too-many-requests':
      return 'Too many reset requests. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return NETWORK;
    default:
      return "We couldn't send the reset email. Try again in a moment.";
  }
}

// Same hint the customer app shows (apps/customer-mobile/src/lib/profile.ts);
// the rule itself is the shared domain validator the API mirrors.
export const PHONE_HINT = 'Enter a Philippine mobile number, like 0917 123 4567.';
export const MIN_PASSWORD = 8;
const NAME_MAX = 80; // the API's UpdateMeDto bound
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupInput = { name: string; email: string; password: string; phone: string };
export type SignupErrors = Partial<Record<keyof SignupInput, string>>;
export type SignupResult = { ok: true; value: SignupInput } | { ok: false; errors: SignupErrors };

export function validateSignup(input: SignupInput): SignupResult {
  const errors: SignupErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) errors.name = 'Enter your name.';
  else if (name.length > NAME_MAX) errors.name = `Keep your name under ${NAME_MAX} characters.`;
  if (!EMAIL.test(email)) errors.email = 'Enter your email, like lorna@yourshop.ph.';
  if (input.password.length < MIN_PASSWORD) {
    errors.password = `Use a password with at least ${MIN_PASSWORD} characters.`;
  }
  const phone = normalizePhMobile(input.phone);
  if (!phone) errors.phone = PHONE_HINT;
  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, value: { name, email, password: input.password, phone } };
}
