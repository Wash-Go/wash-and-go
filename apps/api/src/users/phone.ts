// Philippine mobile numbers (U0 T4). Hand-MIRROR of
// packages/domain/src/phone.ts — the API can only type-import the domain
// package. phone.spec.ts runs both copies over the same inputs; change them
// together.

// Accepted after stripping spaces/dashes: 09XXXXXXXXX, 9XXXXXXXXX,
// +639XXXXXXXXX, 639XXXXXXXXX. The capture is the 10-digit national number.
export const PH_MOBILE_PATTERN = /^(?:\+63|63|0)?(9\d{9})$/;
export const PHONE_SEPARATORS = /[\s-]/g;

// Email sign-ups have no phone yet; `pending:<firebaseUid>` keeps the unique,
// non-null User.phone column satisfied until the user adds a real number.
export const PLACEHOLDER_PHONE_PREFIX = 'pending:';

// Canonical +639XXXXXXXXX, or null when the input isn't a PH mobile number.
export function normalizePhMobile(raw: string): string | null {
  const m = raw.replace(PHONE_SEPARATORS, '').match(PH_MOBILE_PATTERN);
  return m ? `+63${m[1]}` : null;
}

export function placeholderPhone(firebaseUid: string): string {
  return `${PLACEHOLDER_PHONE_PREFIX}${firebaseUid}`;
}

export function isPlaceholderPhone(phone: string): boolean {
  return phone.startsWith(PLACEHOLDER_PHONE_PREFIX);
}

// What any response may carry for a user's phone: the real number, or null
// while it is still the placeholder (never dial or show `pending:<uid>`).
export function visiblePhone(phone: string): string | null {
  return isPlaceholderPhone(phone) ? null : phone;
}
