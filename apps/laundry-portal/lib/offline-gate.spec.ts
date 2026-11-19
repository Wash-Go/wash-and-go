import { clearGateSnapshot, GATE_KEY, readGateSnapshot, saveGateSnapshot, snapshotAllowed, type GateSnapshot } from './offline-gate';

function store() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

const snap: GateSnapshot = {
  uid: 'fb:abc',
  kind: 'ready',
  shopName: 'Tetuan Laundry Hub',
  shopStatus: 'VERIFIED',
  owner: true,
};

describe('gate snapshot', () => {
  it('round-trips for the same uid', () => {
    const s = store();
    saveGateSnapshot(s, snap);
    expect(readGateSnapshot(s, 'fb:abc')).toEqual(snap);
  });

  it('never hands one account another account’s gate', () => {
    const s = store();
    saveGateSnapshot(s, snap);
    expect(readGateSnapshot(s, 'fb:other')).toBeNull();
    expect(readGateSnapshot(s, 'dev:abc')).toBeNull();
  });

  it('rejects junk and partial data', () => {
    const s = store();
    s.setItem(GATE_KEY, '{not json');
    expect(readGateSnapshot(s, 'fb:abc')).toBeNull();
    s.setItem(GATE_KEY, JSON.stringify({ uid: 'fb:abc', kind: 'admin' }));
    expect(readGateSnapshot(s, 'fb:abc')).toBeNull();
    s.setItem(GATE_KEY, JSON.stringify({ ...snap, shopStatus: 'NOPE' }));
    expect(readGateSnapshot(s, 'fb:abc')).toBeNull();
  });

  it('keeps a staff snapshot without a shop', () => {
    const s = store();
    const staff: GateSnapshot = { uid: 'fb:s', kind: 'ready', shopName: null, shopStatus: null, owner: false };
    saveGateSnapshot(s, staff);
    expect(readGateSnapshot(s, 'fb:s')).toEqual(staff);
  });

  it('clears', () => {
    const s = store();
    saveGateSnapshot(s, snap);
    clearGateSnapshot(s);
    expect(s.m.has(GATE_KEY)).toBe(false);
  });

  it('survives storage that throws or is missing', () => {
    expect(() => saveGateSnapshot(broken, snap)).not.toThrow();
    expect(readGateSnapshot(broken, 'fb:abc')).toBeNull();
    expect(() => clearGateSnapshot(broken)).not.toThrow();
    expect(readGateSnapshot(null, 'fb:abc')).toBeNull();
  });
});

describe('snapshotAllowed', () => {
  it('opens the snapshot when the browser is offline', () => {
    expect(snapshotAllowed(new Error('anything'), false)).toBe(true);
  });

  it('opens it online only for a fetch that never got an answer (TypeError)', () => {
    expect(snapshotAllowed(new TypeError('Failed to fetch'), true)).toBe(true);
  });

  it('never for a status-less error of any other kind while online', () => {
    expect(snapshotAllowed(new Error('boom'), true)).toBe(false);
    expect(snapshotAllowed({ message: 'weird' }, true)).toBe(false);
    expect(snapshotAllowed(undefined, true)).toBe(false);
  });

  it('never for an API error with a status', () => {
    const apiError = Object.assign(new TypeError('x'), { status: 500 });
    expect(snapshotAllowed(apiError, true)).toBe(false);
    expect(snapshotAllowed({ status: 401 }, false)).toBe(false);
  });
});
