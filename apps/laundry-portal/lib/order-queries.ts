import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { api } from './api';
import { ACTIVE_LIMIT, DONE_PAGE } from './queue';

// React Query keys and options for the queue. Everything order-shaped lives
// under ['orders', …] so one invalidate refreshes the lists, the tab counts,
// the badge and any open detail.
export const ORDERS_KEY = ['orders'] as const;

// Every non-terminal order of the shop in one page (GET /orders?active=true,
// oldest first, no cursor).
export function listActiveOrders(): Promise<OrderView[]> {
  return api.listActiveOrders(undefined, ACTIVE_LIMIT);
}

// ONE active query for the whole console: the queue, its counts, the tab
// badge, the title and the new-order ring share this key, so it is polled
// once every 5 s (the app default). Search filters it client-side
// (filterByCode) rather than polling a second, filtered active list.
export const ACTIVE_LIST_KEY = ['orders', 'active'] as const;

export function activeListQuery() {
  return { queryKey: ACTIVE_LIST_KEY, queryFn: listActiveOrders };
}

// Done, one terminal status per query, newest first, searched server-side.
// Polled only while the Done tab is open, every 10 s: Done changes slowly,
// and that keeps the worst case (active 12 + Done 12 + an open detail 12)
// at 36 requests a minute against the API's 60/min limit.
export function doneListQuery(status: OrderStatus, q: string, open: boolean, pageSize = DONE_PAGE) {
  return {
    queryKey: ['orders', 'done', status, q, pageSize] as const,
    queryFn: (): Promise<OrderView[]> => api.listOrders(status, q || undefined, pageSize),
    enabled: open,
    refetchInterval: open ? 10_000 : (false as const),
  };
}

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}
