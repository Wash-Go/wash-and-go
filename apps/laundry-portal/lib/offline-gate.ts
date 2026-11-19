import type { ShopStatus } from '@wash-and-go/domain';
import type { Gate } from './gate';

// The gate's last answer, kept so the console can open offline without the
// service worker caching identity (/auth/me, /shop/onboarding are never
// cached). Only handed back to the same uid that saved it; anything malformed
// reads as "no snapshot". Storage can throw (private mode): every access is
// guarded.

export const GATE_KEY = 'wg-portal-gate';

export type GateSnapshot = {
  uid: string; // sessionUid(): 'fb:<firebase uid>' or 'dev:<stub uid>'
  kind: Gate['kind'];
  shopName: string | null;
  shopStatus: ShopStatus | null;
  owner: boolean;
};

type Store = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
};

const KINDS: readonly string[] = ['not-a-shop', 'onboarding', 'ready'];
const STATUSES: readonly string[] = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'];

function valid(x: unknown): x is GateSnapshot {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.uid === 'string' &&
    KINDS.includes(s.kind as string) &&
    (s.shopName === null || typeof s.shopName === 'string') &&
    (s.shopStatus === null || STATUSES.includes(s.shopStatus as string)) &&
    typeof s.owner === 'boolean'
  );
}

export function saveGateSnapshot(store: Store | null | undefined, snap: GateSnapshot): void {
  try {
    store?.setItem(GATE_KEY, JSON.stringify(snap));
  } catch {
    // Not persisted; offline open just won't be available.
  }
}

export function readGateSnapshot(store: Store | null | undefined, uid: string): GateSnapshot | null {
  try {
    const raw = store?.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed) || parsed.uid !== uid) return null;
    const { kind, shopName, shopStatus, owner } = parsed;
    return { uid, kind, shopName, shopStatus, owner };
  } catch {
    return null;
  }
}

export function clearGateSnapshot(store: Store | null | undefined): void {
  try {
    store?.removeItem(GATE_KEY);
  } catch {
    // Nothing to clear.
  }
}

// When the boot may fall back to the snapshot: the browser says it is
// offline, or the request never got an answer (fetch rejects with a
// TypeError). An API error (it has a status) or any other status-less error
// online is a real failure and shows the error state, never stale data.
export function snapshotAllowed(error: unknown, online: boolean): boolean {
  if (typeof (error as { status?: unknown } | null)?.status === 'number') return false;
  return !online || error instanceof TypeError;
}
