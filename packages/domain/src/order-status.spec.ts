import {
  ORDER_STATUSES,
  EXPRESS_TIMELINE,
  STATUS_META,
  statusLabel,
  isTerminal,
} from './order-status';

// Parity guard: these must mirror the Prisma OrderStatus enum in
// apps/api/prisma/schema.prisma. If the schema changes, this list changes too.
const PRISMA_ORDER_STATUS = [
  'BOOKED',
  'ASSIGNED',
  'PICKED_UP',
  'AT_SHOP',
  'PROCESSING',
  'READY_FOR_RETURN',
  'OUT_FOR_RETURN',
  'DELIVERED',
  'CANCELLED',
];

describe('domain order-status', () => {
  it('mirrors the Prisma OrderStatus enum exactly', () => {
    expect([...ORDER_STATUSES]).toEqual(PRISMA_ORDER_STATUS);
  });

  it('has meta for every status', () => {
    for (const s of ORDER_STATUSES) {
      expect(STATUS_META[s]).toBeDefined();
      expect(typeof STATUS_META[s].label).toBe('string');
    }
  });

  it('timeline is the 8 happy-path statuses in order, excluding CANCELLED', () => {
    expect(EXPRESS_TIMELINE).toEqual([
      'BOOKED',
      'ASSIGNED',
      'PICKED_UP',
      'AT_SHOP',
      'PROCESSING',
      'READY_FOR_RETURN',
      'OUT_FOR_RETURN',
      'DELIVERED',
    ]);
    expect(EXPRESS_TIMELINE).not.toContain('CANCELLED');
  });

  it('marks DELIVERED and CANCELLED terminal, others not', () => {
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('BOOKED')).toBe(false);
  });

  it('humanizes labels', () => {
    expect(statusLabel('OUT_FOR_RETURN')).toBe('Out for delivery');
    expect(statusLabel('PROCESSING')).toBe('Washing');
  });
});
