import type { OrderStatus, OrderView } from '@wash-and-go/domain';

// Pure board logic (type-only domain import → unit-testable with plain ts-jest).
export const STATUS_FILTERS: (OrderStatus | 'ALL')[] = [
  'ALL',
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

// The board pages the server (newest first). The status filter goes to the
// API — filtering the newest page client-side hid older orders in that status.
export const ORDERS_PAGE_SIZE = 50;

export function statusParam(filter: OrderStatus | 'ALL'): OrderStatus | undefined {
  return filter === 'ALL' ? undefined : filter;
}

// `before` cursor for the next page: the last order's id while pages come back
// full. A short (or empty) page is the end.
export function nextOrdersCursor(
  page: OrderView[],
  pageSize: number = ORDERS_PAGE_SIZE,
): string | undefined {
  return page.length >= pageSize ? page[page.length - 1]?.id : undefined;
}

// Admin can assign iff the shaped read says ASSIGNED is an available action.
export function canAssign(o: OrderView): boolean {
  return (o.availableActions ?? []).includes('ASSIGNED');
}
