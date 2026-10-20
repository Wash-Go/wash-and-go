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
