'use client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState } from 'react';

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
            // The Dispatch board opts back into live polling per-query.
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
  // first visit fetches, every visit after hydrates instantly. Guarded for SSR
  // (window is undefined during prerender).
  const [persister] = useState(() =>
    typeof window === 'undefined'
      ? null
      : createSyncStoragePersister({ storage: window.localStorage, key: 'wg-admin-cache' }),
  );

  if (!persister) {
    // SSR / prerender: render children without the persistence wrapper.
    return <>{children}</>;
  }

  return (
    <PersistQueryClientProvider
      client={qc}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // drop anything older than a day
        buster: 'v1', // bump to invalidate all persisted caches after a shape change
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
