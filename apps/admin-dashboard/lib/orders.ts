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

export function filterOrders(
  orders: OrderView[],
  status: OrderStatus | 'ALL',
): OrderView[] {
  return status === 'ALL' ? orders : orders.filter((o) => o.status === status);
}

// Admin can assign iff the shaped read says ASSIGNED is an available action.
export function canAssign(o: OrderView): boolean {
  return (o.availableActions ?? []).includes('ASSIGNED');
}
