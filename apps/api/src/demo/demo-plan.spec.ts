import { batchPeriods, DEMO_ORDER_PLAN_COUNTS, demoOrderPlan, eventSteps } from './demo-plan';

const NOW = new Date('2026-10-21T04:00:00Z'); // 12:00 Asia/Manila

describe('demoOrderPlan(now)', () => {
  const plan = demoOrderPlan(NOW);

  it('has the briefed mix of final statuses', () => {
    const counts: Record<string, number> = {};
    for (const o of plan) counts[o.target] = (counts[o.target] ?? 0) + 1;
    expect(counts).toEqual(DEMO_ORDER_PLAN_COUNTS);
    expect(DEMO_ORDER_PLAN_COUNTS).toEqual({
      ASSIGNED: 1,
      PICKED_UP: 1,
      AT_SHOP: 2,
      PROCESSING: 2,
      READY_FOR_RETURN: 1,
      DELIVERED: 6,
      CANCELLED: 1,
    });
  });

  it('every pickup address carries the Demo marker', () => {
    expect(plan.every((o) => o.pickupAddress.startsWith('Demo '))).toBe(true);
  });

  it('AT_SHOP: one Medium Express, one Large Scheduled (trips the 20 kg confirm later)', () => {
    const atShop = plan.filter((o) => o.target === 'AT_SHOP');
    expect(atShop.map((o) => [o.load, o.serviceType, o.weighKg ?? null])).toEqual(
      expect.arrayContaining([
        ['M', 'EXPRESS', null],
        ['L', 'SCHEDULED', null],
      ]),
    );
  });

  it('Large loads are always Scheduled (Express ceiling is 6 kg)', () => {
    expect(plan.filter((o) => o.load === 'L').every((o) => o.serviceType === 'SCHEDULED')).toBe(
      true,
    );
  });

  it('weighed orders (PROCESSING and later) carry a weight within 0–50 kg', () => {
    const weighed = plan.filter((o) =>
      ['PROCESSING', 'READY_FOR_RETURN', 'DELIVERED'].includes(o.target),
    );
    expect(weighed.every((o) => o.weighKg != null && o.weighKg > 0 && o.weighKg <= 50)).toBe(true);
  });

  it('exactly one delivered order is rated 5 stars', () => {
    const rated = plan.filter((o) => o.rating);
    expect(rated).toHaveLength(1);
    expect(rated[0]).toMatchObject({ target: 'DELIVERED', rating: { stars: 5 } });
  });

  it('batches: the two oldest delivered PAID, the next two PENDING, the two newest unbatched', () => {
    const delivered = plan
      .filter((o) => o.target === 'DELIVERED')
      .sort((a, b) => a.bookedAt.getTime() - b.bookedAt.getTime());
    expect(delivered.map((o) => o.batch)).toEqual([
      'PAID',
      'PAID',
      'PENDING',
      'PENDING',
      null,
      null,
    ]);
  });

  it('booked within the last 3 days, and every event time is in the past and ascending', () => {
    for (const o of plan) {
      const ageH = (NOW.getTime() - o.bookedAt.getTime()) / 3_600_000;
      expect(ageH).toBeGreaterThan(0);
      expect(ageH).toBeLessThanOrEqual(72);
      const times = eventSteps(o, NOW).map((s) => s.at.getTime());
      expect(times[0]).toBe(o.bookedAt.getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(Math.max(...times)).toBeLessThan(NOW.getTime());
    }
  });

  it('is deterministic for a given now', () => {
    expect(demoOrderPlan(NOW)).toEqual(plan);
  });
});

describe('eventSteps', () => {
  const plan = demoOrderPlan(NOW);
  const steps = (target: string) =>
    eventSteps(
      plan.find((o) => o.target === target)!,
      NOW,
    ).map((s) => s.kind);

  it('follows the API status machine for each target', () => {
    expect(steps('ASSIGNED')).toEqual(['BOOKED', 'ASSIGNED']);
    expect(steps('PICKED_UP')).toEqual(['BOOKED', 'ASSIGNED', 'PICKED_UP']);
    expect(steps('AT_SHOP')).toEqual(['BOOKED', 'ASSIGNED', 'PICKED_UP', 'AT_SHOP']);
    expect(steps('PROCESSING')).toEqual([
      'BOOKED',
      'ASSIGNED',
      'PICKED_UP',
      'AT_SHOP',
      'WEIGH',
      'PROCESSING',
    ]);
    expect(steps('READY_FOR_RETURN')).toEqual([
      'BOOKED',
      'ASSIGNED',
      'PICKED_UP',
      'AT_SHOP',
      'WEIGH',
      'PROCESSING',
      'READY_FOR_RETURN',
    ]);
    expect(steps('DELIVERED')).toEqual([
      'BOOKED',
      'ASSIGNED',
      'PICKED_UP',
      'AT_SHOP',
      'WEIGH',
      'PROCESSING',
      'READY_FOR_RETURN',
      'OUT_FOR_RETURN',
      'DELIVERED',
    ]);
    expect(steps('CANCELLED')).toEqual(['BOOKED', 'CANCELLED']);
  });
});

describe('batchPeriods', () => {
  it('each period covers exactly its batch’s delivery times, and they do not overlap', () => {
    const plan = demoOrderPlan(NOW);
    const p = batchPeriods(plan, NOW);
    const deliveredAt = (b: 'PAID' | 'PENDING' | null) =>
      plan
        .filter((o) => o.target === 'DELIVERED' && o.batch === b)
        .map((o) => eventSteps(o, NOW).at(-1)!.at.getTime());
    const inside = (t: number, per: { periodStart: Date; periodEnd: Date }) =>
      t >= per.periodStart.getTime() && t < per.periodEnd.getTime();
    expect(deliveredAt('PAID').every((t) => inside(t, p.PAID))).toBe(true);
    expect(deliveredAt('PENDING').every((t) => inside(t, p.PENDING))).toBe(true);
    expect(deliveredAt(null).some((t) => inside(t, p.PAID) || inside(t, p.PENDING))).toBe(false);
    expect(p.PAID.periodEnd.getTime()).toBeLessThanOrEqual(p.PENDING.periodStart.getTime());
  });
});
