import * as admin from 'firebase-admin';
import {
  apiRoot,
  credentialsFileProblem,
  resolveCredentialsPath,
} from '../../src/auth/credentials-path';
import {
  type DemoConfig,
  FIREBASE_SKIPPED_MESSAGE,
  firebaseMode,
} from '../../src/demo/demo-config';
import {
  ensureFirebaseAccounts,
  generatePassword,
  lookupOwnerAccount,
} from '../../src/demo/demo-firebase';
import { type DemoUids, localDemoUids } from '../../src/demo/demo-seed';

/*
 * The firebaseUid per demo role. Firebase is touched ONLY with DEMO_FIREBASE=1
 * (opt-in, even when apps/api/.env loads credentials). Then:
 *  - the OWNER (default: the CEO's real address) is only looked up — never
 *    created or modified. Missing → a clear instruction, and the seed carries
 *    on with the local owner uid;
 *  - the staff / admin / rider / customer demo accounts are created or marked
 *    verified (password: DEMO_PASSWORD, else a generated one printed once).
 * Otherwise: the deterministic local uids for the x-dev-uid stub.
 */
export async function demoUids(
  cfg: DemoConfig,
  env: Record<string, string | undefined>,
  opts: { allowPasswordReset: boolean },
): Promise<{ uids: DemoUids; generatedPassword: string | null }> {
  const local = localDemoUids(cfg);
  const mode = firebaseMode(env);
  if (mode !== 'on') {
    console.log(
      mode === 'off'
        ? FIREBASE_SKIPPED_MESSAGE
        : 'DEMO_FIREBASE=1 but no FIREBASE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS: Firebase accounts skipped.',
    );
    return { uids: local, generatedPassword: null };
  }
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
  const auth = admin.auth();
  const e = cfg.emails;

  const ownerUid = await lookupOwnerAccount(auth, e.owner);
  if (!ownerUid) {
    console.warn(
      `Owner account ${e.owner} does not exist in Firebase. Create it in the Firebase console ` +
        '(or let them sign up in the portal), then re-run. Seeding continues with the local owner uid.',
    );
  }

  const fromEnv = env.DEMO_PASSWORD?.trim();
  const password = fromEnv || generatePassword();
  const resetPasswords = opts.allowPasswordReset && env.DEMO_RESET_PASSWORDS === 'yes';
  const { uids, created } = await ensureFirebaseAccounts(
    auth,
    [
      { email: e.staff, displayName: 'Demo Staff' },
      { email: e.admin, displayName: 'Demo Admin' },
      { email: e.rider, displayName: 'Demo Rider' },
      ...e.customers.map((email, i) => ({ email, displayName: `Demo Customer ${i + 1}` })),
    ],
    { password, resetPasswords },
  );
  console.log(
    `Firebase demo accounts managed (created: ${created.length ? created.join(', ') : 'none'}).`,
  );
  return {
    uids: {
      owner: ownerUid ?? local.owner,
      staff: uids[e.staff],
      admin: uids[e.admin],
      rider: uids[e.rider],
      customers: e.customers.map((c) => uids[c]),
    },
    // Shown once by the caller, only if it was actually applied to an account.
    generatedPassword: !fromEnv && (created.length > 0 || resetPasswords) ? password : null,
  };
}
