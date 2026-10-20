import type { OrderStatus, OrderView } from '@wash-and-go/domain';
import { DONE_PAGE, DONE_STATUSES, mergeOrders, sortQueue } from './queue';

// Done tab paging (pure). Each terminal status is its own newest-first list
// with its own before cursor: the polled first page plus any older pages
// loaded with Load more. Kept out of React so the merge is tested.

export type DonePages = Partial<Record<OrderStatus, { items: OrderView[]; exhausted: boolean }>>;
export type DoneFirsts = Partial<Record<OrderStatus, OrderView[] | undefined>>;

export interface DoneView {
  // Every terminal status has its first page.
  ready: boolean;
  orders: OrderView[];
  // Some status filled its last page: the count reads "N+" and Load more shows.
  canMore: boolean;
  // The next request per status that still has more.
  next: { status: OrderStatus; before: string }[];
}

export function doneView(firsts: DoneFirsts, pages: DonePages, pageSize = DONE_PAGE): DoneView {
  const next: DoneView['next'] = [];
  const all: OrderView[] = [];
  let ready = true;
  for (const status of DONE_STATUSES) {
    const first = firsts[status];
    if (first === undefined) {
      ready = false;
      continue;
    }
    const loaded = pages[status];
    // The polled copy of an order wins over an older loaded page's copy.
    const orders = mergeOrders(first, loaded?.items ?? []);
    all.push(...orders);
    const more = loaded ? !loaded.exhausted : first.length >= pageSize;
    const last = orders[orders.length - 1];
    if (more && last) next.push({ status, before: last.id });
  }
  return { ready, orders: sortQueue(all, () => false), canMore: next.length > 0, next };
}

// Fold loaded pages in. The first time a status pages, its current first
// page is kept as a snapshot: new orders arriving at the top push the oldest
// first-page rows off the polled page, and they would otherwise fall into the
// gap before the loaded pages.
export function applyDonePages(
  pages: DonePages,
  firsts: DoneFirsts,
  loaded: { status: OrderStatus; page: OrderView[] }[],
  pageSize = DONE_PAGE,
): DonePages {
  const out: DonePages = { ...pages };
  for (const { status, page } of loaded) {
    const had = pages[status]?.items ?? firsts[status] ?? [];
    out[status] = { items: mergeOrders(had, page), exhausted: page.length < pageSize };
  }
  return out;
}

// Page size for Done, overridable with ?donePage=N (1..100) so the browser
// smoke can exercise Load more without seeding 100+ delivered orders. Only
// e2e builds (NEXT_PUBLIC_E2E=1) read it: see donePageFor.
export function parseDonePage(param: string | null): number {
  const n = Number(param);
  return Number.isInteger(n) && n >= 1 && n <= DONE_PAGE ? n : DONE_PAGE;
}

// The test hook is honoured only in an e2e build; any other build ignores the
// parameter entirely and uses DONE_PAGE. The page also guards the call with
// the literal `process.env.NEXT_PUBLIC_E2E === '1'`, so Next inlines the flag
// and drops the parameter read from production bundles.
export function donePageFor(e2eFlag: string | undefined, param: string | null): number {
  return e2eFlag === '1' ? parseDonePage(param) : DONE_PAGE;
}
