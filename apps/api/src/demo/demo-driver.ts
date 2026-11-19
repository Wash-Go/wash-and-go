/*
 * Pure parts of the live-order driver (scripts/demo/order.ts): CLI args, which
 * steps remain from an order's current status, and auth headers for either a
 * Firebase ID token or the local x-dev-uid stub.
 */

export interface DriverArgs {
  runId: string;
  stepSeconds: number;
  wait: boolean;
  riderOnly: string | null; // resume an existing order by code
}

export function parseDriverArgs(argv: string[], genRunId: () => string): DriverArgs {
  const out: DriverArgs = { runId: '', stepSeconds: 20, wait: true, riderOnly: null };
  const args = argv.flatMap((a) =>
    a.startsWith('--') && a.includes('=') ? a.split(/=(.*)/s, 2) : [a],
  );
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const value = () => {
      const v = args[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--run') out.runId = value();
    else if (a === '--step-seconds') {
      const n = Number(value());
      if (!Number.isFinite(n) || n < 0) throw new Error('--step-seconds must be a number ≥ 0');
      out.stepSeconds = n;
    } else if (a === '--no-wait') out.wait = false;
    else if (a === '--rider-only') out.riderOnly = value();
    else throw new Error(`Unknown flag ${a}`);
  }
  if (!out.runId) out.runId = genRunId();
  return out;
}

export type DriverStep = 'ASSIGN' | 'PICKED_UP' | 'AT_SHOP';
const ORDER: DriverStep[] = ['ASSIGN', 'PICKED_UP', 'AT_SHOP'];

// The driver stops at AT_SHOP: the CEO weighs it in the portal.
export function remainingDriverSteps(status: string): DriverStep[] {
  const from: Record<string, number> = { BOOKED: 0, ASSIGNED: 1, PICKED_UP: 2 };
  return status in from ? ORDER.slice(from[status]) : [];
}

export type DriverAuth = { kind: 'dev'; uid: string } | { kind: 'token'; idToken: string };

export function authHeaders(a: DriverAuth): Record<string, string> {
  return a.kind === 'dev' ? { 'x-dev-uid': a.uid } : { authorization: `Bearer ${a.idToken}` };
}

// The driver signs in over Firebase REST only with the same explicit opt-in as
// the seed (DEMO_FIREBASE=1) plus a web API key and the demo password;
// otherwise it uses the x-dev-uid stub.
export function driverUsesFirebase(env: Record<string, string | undefined>): boolean {
  return env.DEMO_FIREBASE === '1' && Boolean(env.FIREBASE_WEB_API_KEY && env.DEMO_PASSWORD);
}

// --rider-only: the order with exactly this code, or null.
export function findOrderByCode<T extends { code?: unknown }>(orders: T[], code: string): T | null {
  return orders.find((o) => o.code === code) ?? null;
}

const SIGN_IN_ERRORS: Array<[RegExp, string]> = [
  [/^(INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND)/, 'wrong email or password'],
  [/^USER_DISABLED/, 'account disabled'],
  [/^TOO_MANY_ATTEMPTS_TRY_LATER/, 'too many attempts, try again later'],
];

/*
 * Firebase REST email/password sign-in → ID token. Errors name the email and
 * a known reason only: never the password, the token, or Firebase's raw
 * message (which could echo input).
 */
export async function signInWithPassword(
  fetchFn: typeof fetch,
  apiKey: string,
  email: string,
  password: string,
): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  } catch {
    throw new Error(`${email}: Firebase sign-in unreachable`);
  }
  const body = (await res.json().catch(() => ({}))) as {
    idToken?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    const raw = body.error?.message ?? '';
    const known = SIGN_IN_ERRORS.find(([re]) => re.test(raw));
    throw new Error(`${email}: ${known ? known[1] : `sign-in failed (HTTP ${res.status})`}`);
  }
  if (!body.idToken) throw new Error(`${email}: sign-in returned no idToken`);
  return body.idToken;
}
