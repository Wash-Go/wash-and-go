import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { api } from './api';
import { bucketOf, QUEUE_PAGE } from './queue';

// React Query keys and options for the queue. Everything order-shaped lives
// under ['orders', …] so one invalidate refreshes the lists, the tab counts,
// the badge and any open detail.
export const ORDERS_KEY = ['orders'] as const;

export function orderListKey(status: OrderStatus, q: string) {
  return ['orders', 'list', status, q] as const;
}

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}

// Live tabs poll every 5 s (the app default); Done changes rarely and is
// usually the biggest list, so it polls every 30 s.
export function orderListQuery(status: OrderStatus, q: string) {
  return {
    queryKey: orderListKey(status, q),
    queryFn: (): Promise<OrderView[]> => api.listOrders(status, q || undefined, QUEUE_PAGE),
    refetchInterval: bucketOf(status) === 'done' ? 30_000 : 5_000,
  };
}

// The order's fields as the API sends them. GET /orders spreads every Order
// column, so the stored commission and shop payout arrive too, although the
// shared OrderView type does not declare them (packages/domain is read-only
// in this slice). Read them as optional and show them only when present.
export type ShopOrder = OrderView & {
  commissionPhp?: string;
  shopRemittancePhp?: string;
};
