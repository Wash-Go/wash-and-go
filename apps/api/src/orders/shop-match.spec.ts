import { rankShopCandidates, ShopCandidate } from './shop-match';

const cand = (over: Partial<ShopCandidate>): ShopCandidate => ({
  shopServiceId: 'ss',
  shopId: 'shop',
  km: 1,
  turnaroundHours: 24,
  slotsPerDay: 10,
  usedToday: 0,
  avgRating: 0,
  ...over,
});

describe('rankShopCandidates', () => {
  it('picks the nearest when all have capacity', () => {
    const near = cand({ shopServiceId: 'near', km: 0.5 });
    const far = cand({ shopServiceId: 'far', km: 3 });
    expect(rankShopCandidates([far, near], true)[0].shopServiceId).toBe('near');
  });

  it('deprioritizes a nearer shop that is at its express cap (capacity-aware)', () => {
    const nearFull = cand({ shopServiceId: 'nearFull', km: 0.5, slotsPerDay: 5, usedToday: 5 });
    const farOpen = cand({ shopServiceId: 'farOpen', km: 3, slotsPerDay: 5, usedToday: 1 });
    expect(rankShopCandidates([nearFull, farOpen], true)[0].shopServiceId).toBe('farOpen');
  });

  it('breaks a distance tie by faster turnaround', () => {
    const slow = cand({ shopServiceId: 'slow', km: 1, turnaroundHours: 48 });
    const fast = cand({ shopServiceId: 'fast', km: 1, turnaroundHours: 12 });
    expect(rankShopCandidates([slow, fast], true)[0].shopServiceId).toBe('fast');
  });

  it('breaks a distance+turnaround tie by higher rating', () => {
    const low = cand({ shopServiceId: 'low', km: 1, turnaroundHours: 24, avgRating: 3.2 });
    const high = cand({ shopServiceId: 'high', km: 1, turnaroundHours: 24, avgRating: 4.8 });
    expect(rankShopCandidates([low, high], true)[0].shopServiceId).toBe('high');
  });

  it('ignores capacity when not capacity-aware (Scheduled) — nearest wins even if full', () => {
    const nearFull = cand({ shopServiceId: 'nearFull', km: 0.5, slotsPerDay: 5, usedToday: 5 });
    const farOpen = cand({ shopServiceId: 'farOpen', km: 3, slotsPerDay: 5, usedToday: 0 });
    expect(rankShopCandidates([nearFull, farOpen], false)[0].shopServiceId).toBe('nearFull');
  });
});
