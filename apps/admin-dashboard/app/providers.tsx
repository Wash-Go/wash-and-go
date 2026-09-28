'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState } from 'react';
import { shouldPersistQuery } from '../lib/query-cache';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache "until the data actually changes": never refetch on time —
            // a page is fetched once, then served from cache on every later visit
            // (even after a full reload, via the localStorage persister below).
            // Writes call invalidateQueries, so the only refetch is a real change.
            // Money + live pages opt out per query: the Dispatch board polls,
            // Rider cash / Payouts use MONEY_QUERY_OPTIONS (lib/query-cache).
            staleTime: Infinity,
            gcTime: Infinity,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 1,
          },
        },
      }),
  );

  // Persist the cache to localStorage so it survives full page reloads — the
  // first visit fetches, every visit after hydrates instantly. Money and live
  // queries (orders, rider cash, payouts) are never written to disk; see
  // shouldPersistQuery. Guarded for SSR (window is undefined during prerender).
  const [persister] = useState(() =>
    typeof window === 'undefined'
      ? null
      : createSyncStoragePersister({ storage: window.localStorage, key: 'wg-admin-cache' }),
  );

  if (!persister) {
    // SSR / prerender: a plain QueryClientProvider (still a provider — just no
    // localStorage persistence, which is client-only). Persistence layers on in
    // the browser branch below.
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={qc}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // drop anything older than a day
        // Bump to invalidate all persisted caches after a shape change. v2 drops
        // the money queries earlier versions wrote to disk.
        buster: 'v2',
        dehydrateOptions: {
          // status === 'success' is TanStack's default rule (inlined: the
          // persister and react-query resolve different query-core copies, so
          // importing defaultShouldDehydrateQuery doesn't type-check).
          shouldDehydrateQuery: (q) =>
            q.state.status === 'success' && shouldPersistQuery(q.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
