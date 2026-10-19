import type { OrderView } from '@wash-and-go/domain';
import { ORDERS_PAGE_SIZE, canAssign, nextOrdersCursor, statusParam } from './orders';

function o(over: Partial<OrderView>): OrderView {
  return { id: 'x', status: 'BOOKED', availableActions: [], ...over } as OrderView;
}

const page = (n: number) => Array.from({ length: n }, (_, i) => o({ id: `ord-${i + 1}` }));

describe('board logic', () => {
  it('sends the status filter to the server, nothing for ALL', () => {
    expect(statusParam('ALL')).toBeUndefined();
    expect(statusParam('BOOKED')).toBe('BOOKED');
  });

  it('pages on with the last order id while pages come back full', () => {
    expect(nextOrdersCursor(page(ORDERS_PAGE_SIZE))).toBe(`ord-${ORDERS_PAGE_SIZE}`);
    expect(nextOrdersCursor(page(3), 3)).toBe('ord-3');
  });

  it('stops at a short or empty page', () => {
    expect(nextOrdersCursor(page(ORDERS_PAGE_SIZE - 1))).toBeUndefined();
    expect(nextOrdersCursor([])).toBeUndefined();
  });

  it('canAssign follows availableActions', () => {
    expect(canAssign(o({ availableActions: ['ASSIGNED'] }))).toBe(true);
    expect(canAssign(o({ availableActions: [] }))).toBe(false);
    expect(canAssign(o({ availableActions: ['PICKED_UP'] }))).toBe(false);
  });
});
