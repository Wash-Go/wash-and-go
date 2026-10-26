import type { PendingInviteView } from '@wash-and-go/domain';

// Staff invite acceptance (plan A3 flow 6, explicit accept). The API scopes
// GET /shop/invites/pending to the caller's stored verified email, so the
// result list decides whether a card shows; the flags only decide whether to
// ask at all. Pure, so every combination is jest-tested.

const status = (e: unknown): number | undefined => {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : undefined;
};

// inviteEmailOnFile (B6a) is the flag: the API matches invites against the
// stored User.email, so ask exactly when it says one is on file. That also
// holds under the dev x-dev-uid stub (a dev-route user created with an
// email). An older API without the flag falls back to emailVerified, except
// under the stub, which has no Firebase email to have verified.
export function shouldFetchPendingInvites(s: {
  devBypass: boolean;
  inviteEmailOnFile: boolean | undefined;
  emailVerified: boolean | undefined;
}): boolean {
  if (s.inviteEmailOnFile !== undefined) return s.inviteEmailOnFile;
  if (s.devBypass) return false;
  return !!s.emailVerified;
}

function firstOpen(invites: readonly PendingInviteView[], dismissed: readonly string[]): PendingInviteView | null {
  return invites.find((i) => !dismissed.includes(i.id)) ?? null;
}

// Not-a-shop screen: an invite replaces "Register your laundry" as the
// primary; an unverified account with no invite is told to verify first.
export function notAShopMode(s: {
  emailVerified: boolean | undefined;
  invites: readonly PendingInviteView[];
  dismissed: readonly string[];
}): { invite: PendingInviteView | null; verifyFirst: boolean; primary: 'accept' | 'register' } {
  const invite = firstOpen(s.invites, s.dismissed);
  if (invite) return { invite, verifyFirst: false, primary: 'accept' };
  return { invite: null, verifyFirst: !s.emailVerified, primary: 'register' };
}

// Console shell (the user already has a shop): a banner for the first open
// invite. Accepting answers 409 there today; the banner shows that message.
export function shellInvite(s: {
  invites: readonly PendingInviteView[];
  dismissed: readonly string[];
}): PendingInviteView | null {
  return firstOpen(s.invites, s.dismissed);
}

export function inviteHeadline(i: PendingInviteView): string {
  const who = i.invitedByName.trim();
  return who ? `${who} invited you to join ${i.shopName}` : `${i.shopName} invited you to join their team`;
}

export type AcceptOutcome =
  | { kind: 'refresh'; note?: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

// null = the accept succeeded (200, first time or a repeat).
export function acceptOutcome(error: unknown): AcceptOutcome {
  if (error == null) return { kind: 'refresh' };
  const s = status(error);
  // Already accepted (an API before B6a answered a repeat with 404), revoked,
  // or gone: refresh and let the gate decide.
  if (s === 404) return { kind: 'refresh', note: 'That invite is no longer open.' };
  if (s === 409) {
    return { kind: 'conflict', message: 'This account already belongs to a shop. For now, one account can work at one shop.' };
  }
  return { kind: 'error', message: 'We couldn’t accept the invite. Check your connection, then try again.' };
}

// ---------- Owner side: the invite form ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function inviteEmailError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Enter their email address.';
  if (!EMAIL.test(v) || v.length > 254) return 'Enter a full email address, like ana@gmail.com.';
  return null;
}

export function inviteErrorMessage(error: unknown): string {
  const s = status(error);
  if (s === 409) return 'Already a member or already invited.';
  if (s === 400) {
    const msg = String((error as { message?: unknown }).message ?? '');
    return /\b20\b|open invites/i.test(msg) ? 'You can have up to 20 open invites. Revoke one first.' : 'Check the email address.';
  }
  return 'We couldn’t send the invite. Check your connection, then try again.';
}
