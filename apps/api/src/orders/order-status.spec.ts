import { OrderStatus } from '@prisma/client';
import {
  isLegalTransition,
  rolesForTransition,
  canRoleDrive,
  isTerminal,
} from './order-status';

const ALL = Object.values(OrderStatus);

const LEGAL: Array<[OrderStatus, OrderStatus]> = [
  ['BOOKED', 'ASSIGNED'],
  ['ASSIGNED', 'PICKED_UP'],
  ['PICKED_UP', 'AT_SHOP'],
  ['AT_SHOP', 'PROCESSING'],
  ['PROCESSING', 'READY_FOR_RETURN'],
  ['READY_FOR_RETURN', 'OUT_FOR_RETURN'],
  ['OUT_FOR_RETURN', 'DELIVERED'],
  // cancel edges from every non-terminal state
  ['BOOKED', 'CANCELLED'],
  ['ASSIGNED', 'CANCELLED'],
  ['PICKED_UP', 'CANCELLED'],
  ['AT_SHOP', 'CANCELLED'],
  ['PROCESSING', 'CANCELLED'],
  ['READY_FOR_RETURN', 'CANCELLED'],
];

describe('order-status machine', () => {
  it('allows every legal transition', () => {
    for (const [from, to] of LEGAL) {
      expect(isLegalTransition(from, to)).toBe(true);
    }
  });

  it('rejects every transition not in the legal set', () => {
    const legalSet = new Set(LEGAL.map(([f, t]) => `${f}->${t}`));
    for (const from of ALL) {
      for (const to of ALL) {
        if (legalSet.has(`${from}->${to}`)) continue;
        expect(isLegalTransition(from, to)).toBe(false);
      }
    }
  });

  it('treats DELIVERED and CANCELLED as terminal', () => {
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('BOOKED')).toBe(false);
  });

  it('cannot leave a terminal state', () => {
    for (const to of ALL) {
      expect(isLegalTransition('DELIVERED', to)).toBe(false);
      expect(isLegalTransition('CANCELLED', to)).toBe(false);
    }
  });

  describe('role gating (D2 matrix)', () => {
    it('rider drives pickup/return/deliver, not shop steps', () => {
      expect(canRoleDrive('ASSIGNED', 'PICKED_UP', ['RIDER'])).toBe(true);
      expect(canRoleDrive('OUT_FOR_RETURN', 'DELIVERED', ['RIDER'])).toBe(true);
      expect(canRoleDrive('AT_SHOP', 'PROCESSING', ['RIDER'])).toBe(false);
    });

    it('shop drives processing steps', () => {
      expect(canRoleDrive('AT_SHOP', 'PROCESSING', ['SHOP_STAFF'])).toBe(true);
      expect(
        canRoleDrive('PROCESSING', 'READY_FOR_RETURN', ['SHOP_OWNER']),
      ).toBe(true);
    });

    it('admin can drive any legal edge', () => {
      for (const [from, to] of LEGAL) {
        expect(canRoleDrive(from, to, ['ADMIN'])).toBe(true);
      }
    });

    it('customer may cancel only while early (BOOKED/ASSIGNED); later cancels are admin-only', () => {
      expect(canRoleDrive('BOOKED', 'CANCELLED', ['CUSTOMER'])).toBe(true);
      expect(canRoleDrive('ASSIGNED', 'CANCELLED', ['CUSTOMER'])).toBe(true);
      expect(canRoleDrive('PICKED_UP', 'CANCELLED', ['CUSTOMER'])).toBe(false);
      expect(canRoleDrive('PROCESSING', 'CANCELLED', ['CUSTOMER'])).toBe(false);
      expect(canRoleDrive('PROCESSING', 'CANCELLED', ['SHOP_OWNER'])).toBe(false);
      expect(canRoleDrive('PROCESSING', 'CANCELLED', ['ADMIN'])).toBe(true);
    });

    it('no role can drive an illegal edge', () => {
      expect(rolesForTransition('BOOKED', 'DELIVERED')).toEqual([]);
      expect(canRoleDrive('BOOKED', 'DELIVERED', ['ADMIN'])).toBe(false);
    });
  });
});
