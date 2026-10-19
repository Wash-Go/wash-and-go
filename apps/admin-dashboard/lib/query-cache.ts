// Which queries the admin persists to localStorage, and how money pages refetch.
// Pure (no React) so it runs under the node jest config.
//
// The cache is persisted so slow-changing lists (shops, users, config, zones)
// hydrate instantly after a reload. Money and live-ops reads must never come
// back from disk: a day-old rider balance or payout total looks current but is
// wrong. They are fetched fresh on every load instead.
const LIVE_QUERY_ROOTS = new Set(['orders', 'rider-cash', 'remittance']);

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return !LIVE_QUERY_ROOTS.has(String(queryKey[0]));
}

// Money pages (Rider cash, Payouts): short staleness, refetch when the admin
// comes back to the tab or the page. The app default is "cache forever".
export const MONEY_QUERY_OPTIONS = {
  staleTime: 15_000,
  refetchOnWindowFocus: true,
  refetchOnMount: true,
} as const;
