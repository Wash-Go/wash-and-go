// "Ensure session": make sure the signed-in Firebase user has a Postgres User row.
// POST /auth/session is an idempotent upsert — the first call creates the row
// (without it every API call 401s "User not found" and the account never shows
// up on the admin Users page to be granted a role); repeat calls are harmless.
//
// Pure logic, no firebase/React imports, so it runs under the node jest config.

export type Session = { id: string; roles: string[] };

export type SessionResult =
  // session is null when there was no Firebase user, so nothing to sync.
  | { ok: true; session: Session | null }
  | { ok: false; message: string; error: unknown };

export interface SessionApi {
  postSession(): Promise<Session>;
}

export async function ensureSession(
  firebaseUser: { uid: string } | null | undefined,
  api: SessionApi,
): Promise<SessionResult> {
  // No Firebase user → no call. The dev x-dev-uid stub authenticates without
  // one, and postSession would send a null idToken.
  if (!firebaseUser) return { ok: true, session: null };
  try {
    return { ok: true, session: await api.postSession() };
  } catch (error) {
    return { ok: false, message: sessionErrorMessage(error), error };
  }
}

// Login path: the console must not open without the DB user. If it can't be
// created, sign back out of Firebase so the person isn't left half-signed-in,
// and hand the message back for the login form.
export async function sessionAfterSignIn(
  firebaseUser: { uid: string } | null | undefined,
  api: SessionApi,
  signOut: () => Promise<void>,
): Promise<SessionResult> {
  const result = await ensureSession(firebaseUser, api);
  if (!result.ok) await signOut().catch(() => undefined);
  return result;
}

// Human copy for a failed POST /auth/session. ApiError carries an HTTP status;
// anything without one never got a response (offline, DNS, CORS, token fetch).
export function sessionErrorMessage(error: unknown): string {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status !== 'number') {
    return "Can't reach the Wash & Go server. Check your connection and try again.";
  }
  if (status === 401 || status === 403) {
    return "We couldn't verify your sign-in. Please sign in again.";
  }
  if (status === 429) return 'Too many attempts — try again in a minute.';
  return "Signed in, but we couldn't set up your account. Try again in a moment.";
}
