import { normalizePhMobile, type MeView } from '@wash-and-go/domain';

// Name + mobile number for sign-up, the "Your details" screen and the booking
// gate (U0 T4). Pure logic so it runs under the plain ts-jest config. The phone
// rule is the shared domain function the API mirrors (parity-tested there).

export const PHONE_HINT = 'Enter a Philippine mobile number, like 0917 123 4567.';
export const DUPLICATE_PHONE_MESSAGE =
  'That mobile number is already used by another account.';
const NAME_REQUIRED = 'Enter your name.';
const NAME_MAX = 80; // matches the API's UpdateMeDto

export type ContactErrors = { name?: string; phone?: string };
export type ContactResult =
  | { ok: true; name?: string; phone: string }
  | { ok: false; errors: ContactErrors };

// `name` omitted = only the number is being asked for (the booking gate).
export function validateContact(input: { name?: string; phone: string }): ContactResult {
  const errors: ContactErrors = {};
  let name: string | undefined;
  if (input.name !== undefined) {
    name = input.name.trim();
    if (!name) errors.name = NAME_REQUIRED;
    else if (name.length > NAME_MAX) errors.name = `Keep your name under ${NAME_MAX} characters.`;
  }
  const phone = normalizePhMobile(input.phone);
  if (!phone) errors.phone = PHONE_HINT;
  if (errors.name || errors.phone || !phone) return { ok: false, errors };
  return name === undefined ? { ok: true, phone } : { ok: true, name, phone };
}

// Email sign-ups start without a number; booking waits until they add one.
export function needsMobileNumber(me: Pick<MeView, 'phone'>): boolean {
  return me.phone === null;
}

// PATCH /auth/me failure → short human copy. Duck-types ApiError.status; server
// text is never shown.
export function profileSaveErrorMessage(err: unknown): string {
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status: unknown }).status)
      : undefined;
  if (status === undefined || Number.isNaN(status)) {
    return "Can't reach the Wash & Go server. Check your connection and try again.";
  }
  if (status === 409) return DUPLICATE_PHONE_MESSAGE;
  if (status === 400) return PHONE_HINT;
  if (status === 401 || status === 403) {
    return "We couldn't verify your sign-in. Please sign in again.";
  }
  if (status === 429) return 'Too many attempts — try again in a minute.';
  return "Couldn't save your details. Try again in a moment.";
}
