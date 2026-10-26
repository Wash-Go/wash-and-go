import { monogram } from '../monogram';
import { DEMO_ORDERS, DEMO_SHOP } from './fixture';
import { DEMO_STATE_KEY, DEMO_STATE_MAX_AGE_MS, DEMO_STATE_VERSION, loadState, saveState, seedState } from './store';

const NOW = Date.parse('2026-10-20T06:00:00Z');

function mem(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('seedState', () => {
  const s = seedState(NOW);

  it('has the fourteen B9 orders in every bucket', () => {
    expect(s.orders).toHaveLength(DEMO_ORDERS.length);
    const count = (st: string) => s.orders.filter((o) => o.status === st).length;
    expect([count('ASSIGNED'), count('PICKED_UP'), count('AT_SHOP'), count('PROCESSING')]).toEqual([1, 1, 2, 2]);
    expect([count('READY_FOR_RETURN'), count('DELIVERED'), count('CANCELLED')]).toEqual([1, 6, 1]);
  });

  it('dates everything relative to now, all in the past', () => {
    for (const o of s.orders) {
      expect(Date.parse(o.createdAt)).toBeLessThan(NOW);
      for (const e of o.events) expect(Date.parse(e.at)).toBeLessThanOrEqual(NOW);
    }
    const assigned = s.orders.find((o) => o.status === 'ASSIGNED')!;
    expect(NOW - Date.parse(assigned.createdAt)).toBe(0.4 * 3_600_000);
  });

  it('has one paid batch with the demo reference, one pending, two unbatched lines', () => {
    expect(s.batches.map((b) => [b.status, b.reference])).toEqual([
      ['PAID', 'GCASH-DEMO-0001'],
      ['PENDING', null],
    ]);
    expect(s.lines).toHaveLength(6);
    expect(s.lines.filter((l) => l.batchId == null)).toHaveLength(2);
  });

  it('weighed orders are priced on their weight, unweighed on the load estimate', () => {
    const washing = s.orders.find((o) => o.status === 'PROCESSING' && o.weightKg === '6.4')!;
    expect(washing.washValuePhp).toBe('160.00');
    const large = s.orders.find((o) => o.status === 'AT_SHOP' && o.loadCategory === 'L')!;
    expect(large.weightKg).toBeNull();
    expect(large.washValuePhp).toBe('225.00'); // 9 kg estimate × ₱25
  });

  it('shows the demo shop monogram from its name', () => {
    // monogram() takes the first letters of the first two words.
    expect(monogram(s.shop.name)).toBe('WG');
    expect(s.shop.name).toBe(DEMO_SHOP.name);
  });
});

describe('persistence', () => {
  it('seeds and saves when nothing is stored', () => {
    const st = mem();
    const s = loadState(st, NOW);
    expect(s.version).toBe(DEMO_STATE_VERSION);
    expect(JSON.parse(st.m.get(DEMO_STATE_KEY)!).orders).toHaveLength(14);
  });

  it('round-trips a saved state', () => {
    const st = mem();
    const s = loadState(st, NOW);
    s.shop.name = 'Changed';
    saveState(st, s);
    expect(loadState(st, NOW + 1000).shop.name).toBe('Changed');
  });

  it('re-seeds a bad or old-version state', () => {
    expect(loadState(mem({ [DEMO_STATE_KEY]: '{nope' }), NOW).orders).toHaveLength(14);
    const old = JSON.stringify({ ...seedState(NOW), version: DEMO_STATE_VERSION - 1, orders: [] });
    expect(loadState(mem({ [DEMO_STATE_KEY]: old }), NOW).orders).toHaveLength(14);
  });

  it('re-seeds a state seeded more than 24 h ago, keeps a fresher one', () => {
    const st = mem();
    const s = loadState(st, NOW);
    s.shop.name = 'Edited';
    saveState(st, s);
    expect(loadState(st, NOW + DEMO_STATE_MAX_AGE_MS).shop.name).toBe('Edited');
    const later = NOW + DEMO_STATE_MAX_AGE_MS + 1;
    const re = loadState(st, later);
    expect(re.shop.name).toBe('Wash & Go Demo Laundry');
    expect(re.seededAt).toBe(later);
    expect(Date.parse(re.orders.find((o) => o.status === 'ASSIGNED')!.createdAt)).toBe(later - 0.4 * 3_600_000);
  });

  it('works without storage', () => {
    expect(loadState(null, NOW).orders).toHaveLength(14);
    expect(() => saveState(null, seedState(NOW))).not.toThrow();
  });
});
