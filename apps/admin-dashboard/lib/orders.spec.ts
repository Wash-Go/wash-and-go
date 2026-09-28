import type { OrderView } from '@wash-and-go/domain';
import { canAssign, filterOrders } from './orders';

function o(over: Partial<OrderView>): OrderView {
  return { id: 'x', status: 'BOOKED', availableActions: [], ...over } as OrderView;
}

describe('board logic', () => {
  it('filters by status, ALL passes everything', () => {
    const list = [o({ status: 'BOOKED' }), o({ status: 'DELIVERED' })];
    expect(filterOrders(list, 'ALL')).toHaveLength(2);
    expect(filterOrders(list, 'DELIVERED').map((x) => x.status)).toEqual([
      'DELIVERED',
    ]);
  });

  it('canAssign follows availableActions', () => {
    expect(canAssign(o({ availableActions: ['ASSIGNED'] }))).toBe(true);
    expect(canAssign(o({ availableActions: [] }))).toBe(false);
    expect(canAssign(o({ availableActions: ['PICKED_UP'] }))).toBe(false);
  });
});
