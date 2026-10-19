import type { OrderView } from '@wash-and-go/domain';
import {
  actionLabel,
  activeJobCount,
  collectsCash,
  deliverSlideLabel,
  jobGroup,
  needsCashRecord,
  needsConfirm,
  sortJobs,
} from './triage';

function job(over: Partial<OrderView>): OrderView {
  return {
    id: 'x',
    code: 'WG-2026-000001',
    status: 'ASSIGNED',
    serviceType: 'EXPRESS',
    pickupAddress: 'Tetuan',
    shopId: 's1',
    assignedRiderId: 'r1',
    weightEstimateKg: '6',
    weightKg: null,
    washValuePhp: '150',
    deliveryFeePhp: '65',
    serviceFeePhp: '7',
    customerTotalPhp: '222',
    paidCashAt: null,
    createdAt: '2026-07-18T00:00:00.000Z',
    deliveredAt: null,
    ...over,
  } as OrderView;
}

describe('jobGroup', () => {
  it('is "action" when the rider has an available action', () => {
    expect(jobGroup(job({ availableActions: ['PICKED_UP'] }))).toBe('action');
  });
  it('is "waiting" when there is no action and it is not terminal', () => {
    expect(jobGroup(job({ status: 'AT_SHOP', availableActions: [] }))).toBe(
      'waiting',
    );
  });
  it('is "done" when terminal', () => {
    expect(jobGroup(job({ status: 'DELIVERED', availableActions: [] }))).toBe(
      'done',
    );
    expect(jobGroup(job({ status: 'CANCELLED' }))).toBe('done');
  });
});

describe('activeJobCount', () => {
  it('counts only non-terminal jobs: delivered and cancelled are not active', () => {
    const jobs = [
      job({ id: 'a', status: 'ASSIGNED' }),
      job({ id: 'b', status: 'PICKED_UP' }),
      job({ id: 'c', status: 'AT_SHOP' }),
      job({ id: 'd', status: 'PROCESSING' }),
      job({ id: 'e', status: 'READY_FOR_RETURN' }),
      job({ id: 'f', status: 'OUT_FOR_RETURN' }),
      job({ id: 'g', status: 'DELIVERED' }),
      job({ id: 'h', status: 'CANCELLED' }),
    ];
    expect(activeJobCount(jobs)).toBe(6);
  });

  it('is 0 when every job is finished, and for an empty list', () => {
    expect(
      activeJobCount([job({ status: 'DELIVERED' }), job({ status: 'CANCELLED' })]),
    ).toBe(0);
    expect(activeJobCount([])).toBe(0);
  });
});

describe('sortJobs', () => {
  it('puts needs-action first, waiting next, done last', () => {
    const jobs = [
      job({ id: 'done', status: 'DELIVERED', availableActions: [] }),
      job({ id: 'wait', status: 'AT_SHOP', availableActions: [] }),
      job({ id: 'act', status: 'ASSIGNED', availableActions: ['PICKED_UP'] }),
    ];
    expect(sortJobs(jobs).map((j) => j.id)).toEqual(['act', 'wait', 'done']);
  });

  it('sorts newest first within a group', () => {
    const jobs = [
      job({ id: 'old', availableActions: ['PICKED_UP'], createdAt: '2026-07-18T00:00:00Z' }),
      job({ id: 'new', availableActions: ['PICKED_UP'], createdAt: '2026-07-18T05:00:00Z' }),
    ];
    expect(sortJobs(jobs).map((j) => j.id)).toEqual(['new', 'old']);
  });
});

describe('actionLabel + needsConfirm', () => {
  it('uses rider verbs', () => {
    expect(actionLabel('PICKED_UP')).toBe('Mark picked up');
    expect(actionLabel('OUT_FOR_RETURN')).toBe('Out for delivery');
    expect(actionLabel('DELIVERED')).toBe('Mark delivered');
  });
  it('requires slide-confirm only for Delivered', () => {
    expect(needsConfirm('DELIVERED')).toBe(true);
    expect(needsConfirm('PICKED_UP')).toBe(false);
  });
});

// U0 T2: delivering a COD order records its cash in the same step, so the one
// slide names the amount; the separate record-cash slide survives only for
// orders delivered before that (DELIVERED with no paidCashAt).
describe('collectsCash', () => {
  it('is true for a positive total (COD is the only payment method)', () => {
    expect(collectsCash(job({ customerTotalPhp: '222' }))).toBe(true);
  });
  it('is false for a zero, negative or unparseable total', () => {
    expect(collectsCash(job({ customerTotalPhp: '0.00' }))).toBe(false);
    expect(collectsCash(job({ customerTotalPhp: '-5' }))).toBe(false);
    expect(collectsCash(job({ customerTotalPhp: 'abc' }))).toBe(false);
  });
});

describe('deliverSlideLabel', () => {
  it('names the cash collected, formatted with the peso helper', () => {
    expect(
      deliverSlideLabel(job({ status: 'OUT_FOR_RETURN', customerTotalPhp: '1547' })),
    ).toBe('Slide: collected ₱1,547.00 & delivered');
  });
  it('falls back to a plain delivered slide when there is no cash to collect', () => {
    expect(
      deliverSlideLabel(job({ status: 'OUT_FOR_RETURN', customerTotalPhp: '0' })),
    ).toBe('Slide to mark delivered');
  });
});

describe('needsCashRecord', () => {
  it('is true for a legacy delivered order with no cash recorded', () => {
    expect(needsCashRecord(job({ status: 'DELIVERED', paidCashAt: null }))).toBe(true);
  });
  it('is false once cash is recorded (the normal path after delivery)', () => {
    expect(
      needsCashRecord(
        job({ status: 'DELIVERED', paidCashAt: '2026-09-28T03:00:00.000Z' }),
      ),
    ).toBe(false);
  });
  it('is false before delivery — the combined slide handles the cash', () => {
    expect(needsCashRecord(job({ status: 'OUT_FOR_RETURN', paidCashAt: null }))).toBe(
      false,
    );
  });
  it('is false for a delivered order with nothing to collect', () => {
    expect(
      needsCashRecord(job({ status: 'DELIVERED', paidCashAt: null, customerTotalPhp: '0' })),
    ).toBe(false);
  });
});
