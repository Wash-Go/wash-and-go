import { Prisma } from '@prisma/client';
import {
  cashToRecordOnDelivery,
  isRiderlessCodDelivery,
} from './cash-on-delivery';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

describe('cashToRecordOnDelivery', () => {
  const unpaid = {
    customerTotalPhp: D('247.00'),
    paidCashAt: null,
    assignedRiderId: 'r1',
  };

  it('is the customer total for an unpaid COD order a rider is carrying', () => {
    const cash = cashToRecordOnDelivery(unpaid);
    expect(cash?.toFixed(2)).toBe('247.00');
  });

  it('is null once the cash is already recorded (never re-stamps paidCashAt)', () => {
    expect(
      cashToRecordOnDelivery({ ...unpaid, paidCashAt: new Date('2026-09-01') }),
    ).toBeNull();
  });

  it('is null for a zero total (no COD to collect, so none is invented)', () => {
    expect(
      cashToRecordOnDelivery({ ...unpaid, customerTotalPhp: D('0.00') }),
    ).toBeNull();
  });

  it('is null for a negative total (corrupt price, never counted as cash)', () => {
    expect(
      cashToRecordOnDelivery({ ...unpaid, customerTotalPhp: D('-5.00') }),
    ).toBeNull();
  });

  it('is null with no assigned rider (nobody holds the cash to owe it)', () => {
    expect(
      cashToRecordOnDelivery({ ...unpaid, assignedRiderId: null }),
    ).toBeNull();
  });
});

// Fix round 1: a positive-total order with no rider and no cash recorded must
// not be delivered — the remittance line would pay the shop while nobody owes
// the matching COD. The service blocks it and points ops at pay-cash.
describe('isRiderlessCodDelivery', () => {
  const riderless = {
    customerTotalPhp: D('197.00'),
    paidCashAt: null,
    assignedRiderId: null,
  };

  it('is true for an unpaid COD order with no rider', () => {
    expect(isRiderlessCodDelivery(riderless)).toBe(true);
  });

  it('is false once a rider is on the order (the cash is recorded against them)', () => {
    expect(isRiderlessCodDelivery({ ...riderless, assignedRiderId: 'r1' })).toBe(false);
  });

  it('is false once the cash was recorded with pay-cash', () => {
    expect(
      isRiderlessCodDelivery({ ...riderless, paidCashAt: new Date('2026-09-01') }),
    ).toBe(false);
  });

  it('is false with nothing to collect', () => {
    expect(
      isRiderlessCodDelivery({ ...riderless, customerTotalPhp: D('0.00') }),
    ).toBe(false);
  });
});
