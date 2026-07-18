import type { OrderView } from '@wash-and-go/domain';
import {
  actionLabel,
  jobGroup,
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
