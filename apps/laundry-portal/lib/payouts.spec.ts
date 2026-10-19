import type { RemittanceBatchView, RemittanceLineView } from '@wash-and-go/domain';
import { isCacheableApiGet } from './sw-routes';
import {
  batchChip,
  batchTotals,
  money,
  pendingSummary,
  periodDays,
  periodLabel,
  referenceText,
  showPayoutNudge,
} from './payouts';

const b = (over: Partial<RemittanceBatchView> = {}): RemittanceBatchView =>
  ({
    id: 'b1',
    periodStart: '2026-10-05T16:00:00.000Z',
    periodEnd: '2026-10-12T16:00:00.000Z',
    totalPhp: '1377.20',
    lineCount: 9,
    status: 'PENDING',
    reference: null,
    paidAt: null,
    ...over,
  }) as RemittanceBatchView;

describe('money', () => {
  it('formats any API amount as ₱ with two decimals', () => {
    expect(money('2417.8')).toBe('₱2,417.80');
    expect(money('264')).toBe('₱264.00');
    expect(money('0.00')).toBe('₱0.00');
  });
});

describe('periodDays / periodLabel', () => {
  it('treats the end as exclusive and reads days in Manila', () => {
    expect(periodDays(b())).toEqual({ first: '2026-10-06', last: '2026-10-12' });
    expect(periodLabel(b())).toBe('Oct 6 – 12');
  });

  it('names both months across a month boundary', () => {
    expect(
      periodLabel(b({ periodStart: '2026-09-28T16:00:00.000Z', periodEnd: '2026-10-05T16:00:00.000Z' })),
    ).toBe('Sep 29 – Oct 5');
  });

  it('adds years across a year boundary', () => {
    expect(
      periodLabel(b({ periodStart: '2025-12-28T16:00:00.000Z', periodEnd: '2026-01-04T16:00:00.000Z' })),
    ).toBe('Dec 29, 2025 – Jan 4, 2026');
  });

  it('keeps a mid-day end on its own day', () => {
    expect(periodDays(b({ periodEnd: '2026-10-12T20:00:00.000Z' })).last).toBe('2026-10-13');
  });

  it('shows a single day once', () => {
    expect(periodLabel(b({ periodEnd: '2026-10-06T16:00:00.000Z' }))).toBe('Oct 6');
  });
});

describe('pendingSummary', () => {
  it('says how many delivered orders are not yet batched', () => {
    expect(pendingSummary({ totalPhp: '2417.80', lineCount: 11, oldestLineAt: null })).toBe(
      '11 delivered orders not yet batched',
    );
    expect(pendingSummary({ totalPhp: '158.40', lineCount: 1, oldestLineAt: null })).toBe(
      '1 delivered order not yet batched',
    );
    expect(pendingSummary({ totalPhp: '0.00', lineCount: 0, oldestLineAt: null })).toBe(
      'Nothing waiting: every delivered order is in a batch',
    );
  });
});

describe('batchChip / referenceText', () => {
  it('maps the batch status to a chip', () => {
    expect(batchChip('PAID').label).toBe('Paid');
    expect(batchChip('PENDING').label).toBe('Transfer pending');
  });

  it('shows the reference, or when it will arrive', () => {
    expect(referenceText(b({ reference: 'GC-7740913526' }))).toBe('GC-7740913526');
    expect(referenceText(b())).toBe('Reference added when ops sends it');
  });
});

describe('batchTotals', () => {
  it('sums the lines in centavos', () => {
    const l = (w: string, c: string, p: string) =>
      ({ washValuePhp: w, commissionPhp: c, payoutPhp: p }) as RemittanceLineView;
    expect(batchTotals([l('0.10', '0.01', '0.09'), l('0.20', '0.02', '0.18')])).toEqual({
      washValuePhp: '0.30',
      commissionPhp: '0.03',
      payoutPhp: '0.27',
    });
    expect(batchTotals([])).toEqual({ washValuePhp: '0.00', commissionPhp: '0.00', payoutPhp: '0.00' });
  });
});

describe('service worker', () => {
  it('caches the payout reads per account like the other shop GETs', () => {
    const api = 'http://api.test';
    for (const p of ['/shop/remittance/batches', '/shop/remittance/pending', '/shop/remittance/batches/b1']) {
      expect(isCacheableApiGet(new URL(api + p), 'GET', 'http://portal.test', api)).toBe(true);
    }
  });
});

describe('showPayoutNudge', () => {
  it('asks an owner with no payout account to add one', () => {
    expect(showPayoutNudge({ myRole: 'OWNER', payoutAccount: null })).toBe(true);
  });

  it('stays quiet for staff, an account on file, or while loading', () => {
    expect(showPayoutNudge({ myRole: 'STAFF', payoutAccount: null })).toBe(false);
    expect(showPayoutNudge({ myRole: 'OWNER', payoutAccount: { method: 'GCASH' } as never })).toBe(false);
    expect(showPayoutNudge(undefined)).toBe(false);
  });
});
