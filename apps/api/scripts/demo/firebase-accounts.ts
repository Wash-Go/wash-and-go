import * as admin from 'firebase-admin';
import {
  apiRoot,
  credentialsFileProblem,
  resolveCredentialsPath,
} from '../../src/auth/credentials-path';
import type { DemoConfig } from '../../src/demo/demo-config';
import { ensureFirebaseAccounts, generatePassword } from '../../src/demo/demo-firebase';
import type { DemoUids } from '../../src/demo/demo-seed';

/*
 * Create/update the demo Firebase accounts with the Admin SDK (same credential
 * rules as FirebaseService: inline JSON wins; a file path resolves from
 * apps/api). Returns the Firebase uids and, when the seed generated a password
 * for an account it created or reset, that password (printed once by the
 * caller, never stored).
 */
export async function demoFirebaseUids(
  cfg: DemoConfig,
  env: Record<string, string | undefined>,
): Promise<{ uids: DemoUids; generatedPassword: string | null; created: string[] }> {
  if (!admin.apps.length) {
    const inline = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (inline) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(inline) as admin.ServiceAccount),
      });
    } else {
      const abs = resolveCredentialsPath(env.GOOGLE_APPLICATION_CREDENTIALS!.trim(), apiRoot());
      const problem = credentialsFileProblem(abs);
      if (problem) throw new Error(problem);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = abs;
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  const e = cfg.emails;
  const accounts = [
    // The owner may be the CEO's own account: its password is set only on create.
    { email: e.owner, displayName: 'Demo Owner', keepPassword: true },
    { email: e.staff, displayName: 'Demo Staff' },
    { email: e.admin, displayName: 'Demo Admin' },
    { email: e.rider, displayName: 'Demo Rider' },
    ...e.customers.map((email, i) => ({ email, displayName: `Demo Customer ${i + 1}` })),
  ];
  const fromEnv = env.DEMO_PASSWORD?.trim();
  const password = fromEnv || generatePassword();
  const resetPasswords = env.DEMO_RESET_PASSWORDS === 'yes';
  const { uids, created } = await ensureFirebaseAccounts(admin.auth(), accounts, {
    password,
    resetPasswords,
  });
  const usedGenerated = !fromEnv && (created.length > 0 || resetPasswords);
  // (A generated password only matters if it was actually applied somewhere.)
  return {
    uids: {
      owner: uids[e.owner],
      staff: uids[e.staff],
      admin: uids[e.admin],
      rider: uids[e.rider],
      customers: e.customers.map((c) => uids[c]),
    },
    generatedPassword: usedGenerated ? password : null,
    created,
  };
}
