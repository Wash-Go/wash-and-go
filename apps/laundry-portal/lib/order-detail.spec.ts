import type { OrderView } from '@wash-and-go/domain';
import { backHref, orderTimeline, payoutPhp, weighHistory } from './order-detail';

const o = (over: Partial<OrderView>): OrderView =>
  ({
    id: 'o1',
    code: 'WG-2026-000141',
    status: 'AT_SHOP',
    serviceType: 'EXPRESS',
    loadCategory: 'M',
    weightEstimateKg: '6',
    weightKg: null,
    createdAt: '2026-10-19T01:58:00Z',
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    rider: { id: 'r1', displayName: 'Ana Reyes' },
    ...over,
  }) as OrderView;

describe('orderTimeline', () => {
  it('marks past steps done, the current one now and the rest next', () => {
    const t = orderTimeline(o({}));
    expect(t.map((s) => [s.status, s.state])).toEqual([
      ['BOOKED', 'done'],
      ['ASSIGNED', 'done'],
      ['PICKED_UP', 'done'],
      ['AT_SHOP', 'now'],
      ['PROCESSING', 'next'],
      ['READY_FOR_RETURN', 'next'],
      ['OUT_FOR_RETURN', 'next'],
      ['DELIVERED', 'next'],
    ]);
  });

  it('uses shop wording and names the rider and the weight', () => {
    const t = orderTimeline(o({ weightKg: '7.20' }));
    expect(t.find((s) => s.status === 'AT_SHOP')?.label).toBe('At your shop · weighed 7.2 kg');
    expect(t.find((s) => s.status === 'ASSIGNED')?.label).toBe('Rider assigned · Ana R.');
  });

  it('stamps only the times the order records', () => {
    const t = orderTimeline(o({ status: 'DELIVERED', weightKg: '7', deliveredAt: '2026-10-19T08:00:00Z' }));
    expect(t.find((s) => s.status === 'BOOKED')?.at).toBe('2026-10-19T01:58:00Z');
    expect(t.find((s) => s.status === 'DELIVERED')?.at).toBe('2026-10-19T08:00:00Z');
    expect(t.find((s) => s.status === 'PROCESSING')?.at).toBeNull();
    expect(t.every((s) => s.state === 'done' || s.status === 'DELIVERED')).toBe(true);
  });

  it('shows a cancelled order as booked then cancelled, with the reason', () => {
    const t = orderTimeline(
      o({ status: 'CANCELLED', cancelledAt: '2026-10-19T03:00:00Z', cancelReason: 'Customer asked' }),
    );
    expect(t.map((s) => [s.status, s.state, s.label])).toEqual([
      ['BOOKED', 'done', 'Booked'],
      ['CANCELLED', 'now', 'Cancelled · Customer asked'],
    ]);
    expect(t[1].at).toBe('2026-10-19T03:00:00Z');
  });
});

describe('weighHistory', () => {
  it('reads estimate then weight', () => {
    expect(weighHistory(o({}))).toBe('Booked as Medium (~6 kg) · not weighed yet');
    expect(weighHistory(o({ weightKg: '7.2' }))).toBe('Booked as Medium (~6 kg) · weighed 7.2 kg');
    expect(weighHistory(o({ loadCategory: null, weightEstimateKg: null, weightKg: '3' }))).toBe('Weighed 3 kg');
  });
});

describe('payoutPhp', () => {
  it('shows the stored shop payout only when the API sent it', () => {
    expect(payoutPhp(o({ shopRemittancePhp: '158.4' }))).toBe('158.4');
    expect(payoutPhp({})).toBeNull();
    expect(payoutPhp(o({ shopRemittancePhp: 'abc' }))).toBeNull();
  });
});

describe('backHref', () => {
  it('returns to the tab the order sits in', () => {
    expect(backHref(o({}) as OrderView)).toBe('/');
    expect(backHref(o({ status: 'BOOKED' }) as OrderView)).toBe('/');
    expect(backHref(o({ status: 'PROCESSING' }) as OrderView)).toBe('/?tab=washing');
    expect(backHref(o({ status: 'OUT_FOR_RETURN' }) as OrderView)).toBe('/?tab=ready');
    expect(backHref(o({ status: 'CANCELLED' }) as OrderView)).toBe('/?tab=done');
  });
});
