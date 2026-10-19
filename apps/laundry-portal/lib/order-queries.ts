import type { OrderView } from '@wash-and-go/domain';
import { api } from './api';
import { QUEUE_PAGE } from './queue';

// React Query keys and options for the queue. Everything order-shaped lives
// under ['orders', …] so one invalidate refreshes the lists, the tab counts,
// the badge and any open detail.
export const ORDERS_KEY = ['orders'] as const;

// One list for the whole queue (see QUEUE_PAGE): every tab, the counts, the
// badge and the new-order ring read the same polled page, so the queue costs
// one request every 5 s (the app default) against the API's 60/min limit.
export function orderListKey(q: string) {
  return ['orders', 'list', q] as const;
}

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}

export function orderListQuery(q: string) {
  return {
    queryKey: orderListKey(q),
    queryFn: (): Promise<OrderView[]> => api.listOrders(undefined, q || undefined, QUEUE_PAGE),
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
