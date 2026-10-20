import { randomBytes } from 'crypto';

// The bit of firebase-admin's Auth the seed uses (so it unit-tests with a fake).
export interface FirebaseAuthLike {
  getUserByEmail(email: string): Promise<{ uid: string }>;
  createUser(p: {
    email: string;
    password: string;
    emailVerified: boolean;
    displayName?: string;
  }): Promise<{ uid: string }>;
  updateUser(uid: string, p: { emailVerified?: boolean; password?: string }): Promise<unknown>;
}

export function generatePassword(): string {
  return randomBytes(15).toString('base64url'); // 20 chars
}

/*
 * Create-or-update the demo-only Firebase accounts (staff, admin, rider,
 * customers) by email. New accounts get the password and emailVerified: true;
 * existing ones are marked emailVerified and keep their password unless
 * resetPasswords. NEVER pass the owner here: see lookupOwnerAccount.
 * Returns email → Firebase uid.
 */
export async function ensureFirebaseAccounts(
  auth: FirebaseAuthLike,
  accounts: Array<{ email: string; displayName?: string }>,
  opts: { password: string; resetPasswords: boolean },
): Promise<{ uids: Record<string, string>; created: string[] }> {
  const uids: Record<string, string> = {};
  const created: string[] = [];
  for (const a of accounts) {
    let uid: string | null = null;
    try {
      uid = (await auth.getUserByEmail(a.email)).uid;
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
    }
    if (uid) {
      await auth.updateUser(uid, {
        emailVerified: true,
        ...(opts.resetPasswords ? { password: opts.password } : {}),
      });
    } else {
      uid = (
        await auth.createUser({
          email: a.email,
          password: opts.password,
          emailVerified: true,
          ...(a.displayName ? { displayName: a.displayName } : {}),
        })
      ).uid;
      created.push(a.email);
    }
    uids[a.email] = uid;
  }
  return { uids, created };
}

/*
 * The owner (default: the CEO's real address) is READ-ONLY to the scripts: no
 * create, no password, not even emailVerified. Returns the uid, or null when
 * the account doesn't exist yet (the caller prints how to create it).
 */
export async function lookupOwnerAccount(
  auth: FirebaseAuthLike,
  email: string,
): Promise<string | null> {
  try {
    return (await auth.getUserByEmail(email)).uid;
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/user-not-found') return null;
    throw e;
  }
}
