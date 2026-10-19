import { ApiClient } from '@wash-and-go/api-client';
import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { api, apiAuth } from './api';
import { ACTIVE_LIMIT, DONE_PAGE } from './queue';

// React Query keys and options for the queue. Everything order-shaped lives
// under ['orders', …] so one invalidate refreshes the lists, the tab counts,
// the badge and any open detail.
export const ORDERS_KEY = ['orders'] as const;

// Every non-terminal order of the shop in one page, oldest first
// (GET /orders?active=true; no cursor). packages/api-client has no method for
// it yet, so this is a second client whose fetch adds active=true to the list
// call: same auth, refresh and ApiError mapping. B6: replace it with
// api.listActiveOrders once the shared client has it.
const activeClient = new ApiClient({
  ...apiAuth,
  fetchFn: (input, init) => {
    const url = new URL(String(input));
    url.searchParams.set('active', 'true');
    return fetch(url, init);
  },
});

export function listActiveOrders(q?: string): Promise<OrderView[]> {
  return activeClient.listOrders(undefined, q || undefined, ACTIVE_LIMIT);
}

export function activeListKey(q: string) {
  return ['orders', 'active', q] as const;
}

// Incoming, Needs you, Washing and Ready, the counts, the badge and the
// new-order ring all read this one query (5 s poll, the app default).
export function activeListQuery(q: string) {
  return { queryKey: activeListKey(q), queryFn: () => listActiveOrders(q) };
}

// Done, one terminal status per query, newest first. Polled every 5 s while
// the Done tab is open and every 30 s otherwise, so the queue stays at or
// under 3 requests per 5 s against the API's 60/min limit.
export function doneListQuery(status: OrderStatus, q: string, open: boolean) {
  return {
    queryKey: ['orders', 'done', status, q] as const,
    queryFn: (): Promise<OrderView[]> => api.listOrders(status, q || undefined, DONE_PAGE),
    refetchInterval: open ? 5_000 : 30_000,
  };
}

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}

// The order's fields as the API sends them. GET /orders spreads every Order
// column, so the stored commission and shop payout arrive too, although the
// shared OrderView type does not declare them (packages/domain is read-only
// in this slice). Read them as optional and show them only when present.
export type ShopOrder = OrderView & {
  commissionPhp?: string;
  shopRemittancePhp?: string;
};
