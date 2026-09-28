import type { RemittanceBatchView } from '@wash-and-go/domain';
import { countByStatus, lastWeekPeriod, pendingTotalPhp } from './remittance';

const batch = (over: Partial<RemittanceBatchView>): RemittanceBatchView => ({
  id: 'b',
  shopId: 'shop1',
  periodStart: '2026-07-13T00:00:00.000Z',
  periodEnd: '2026-07-20T00:00:00.000Z',
  totalPhp: '100.00',
  lineCount: 2,
  status: 'PENDING',
  reference: null,
  paidAt: null,
  paidByUid: null,
  createdAt: '2026-07-20T00:00:00.000Z',
  ...over,
});

describe('remittance helpers', () => {
  it('sums only PENDING payouts, in centavos (no float drift)', () => {
    const total = pendingTotalPhp([
      batch({ totalPhp: '145.50' }),
      batch({ totalPhp: '0.10' }),
      batch({ totalPhp: '999.99', status: 'PAID' }), // excluded
    ]);
    expect(total).toBe('145.60');
  });

  it('counts by status', () => {
    expect(
      countByStatus([
        batch({}),
        batch({ status: 'PAID' }),
        batch({ status: 'PAID' }),
      ]),
    ).toEqual({ pending: 1, paid: 2 });
  });

  it('lastWeekPeriod returns the previous Mon→Mon week', () => {
    // Wed 2026-07-22 → last full week is Mon 2026-07-13 .. Mon 2026-07-20.
    const p = lastWeekPeriod(new Date('2026-07-22T09:30:00Z'));
    expect(p.periodStart.slice(0, 10)).toBe('2026-07-13');
    expect(p.periodEnd.slice(0, 10)).toBe('2026-07-20');
  });
});
