// Philippine mobile numbers (U0 T4). Customers type a number in any of the
// common local shapes; we store one canonical E.164 form (+639XXXXXXXXX) so the
// unique index on User.phone catches the same number typed two ways.
//
// MIRRORED in apps/api/src/users/phone.ts — the API can only type-import this
// package. apps/api/src/users/phone.spec.ts runs this file and the mirror over
// the same inputs, so keep this module import-free and change both together.

// Accepted after stripping spaces/dashes: 09XXXXXXXXX, 9XXXXXXXXX,
// +639XXXXXXXXX, 639XXXXXXXXX. The capture is the 10-digit national number.
export const PH_MOBILE_PATTERN = /^(?:\+63|63|0)?(9\d{9})$/;
export const PHONE_SEPARATORS = /[\s-]/g;

// Email sign-ups have no phone yet; the API stores `pending:<firebaseUid>` to
// satisfy the unique, non-null column. Never a callable number.
export const PLACEHOLDER_PHONE_PREFIX = 'pending:';

// Canonical +639XXXXXXXXX, or null when the input isn't a PH mobile number.
export function normalizePhMobile(raw: string): string | null {
  const m = raw.replace(PHONE_SEPARATORS, '').match(PH_MOBILE_PATTERN);
  return m ? `+63${m[1]}` : null;
}

export function isPlaceholderPhone(phone: string): boolean {
  return phone.startsWith(PLACEHOLDER_PHONE_PREFIX);
}

// A number worth offering a Call button for: present and not a placeholder.
export function callablePhone(phone: string | null | undefined): string | null {
  if (!phone || isPlaceholderPhone(phone)) return null;
  return phone;
}

// Display form for a stored +639XXXXXXXXX: "0917 123 4567". Anything else is
// shown as stored.
export function formatPhMobile(e164: string): string {
  const m = e164.match(/^\+63(9\d{2})(\d{3})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}
