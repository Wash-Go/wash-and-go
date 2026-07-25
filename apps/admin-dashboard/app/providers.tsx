'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Serve cached data on navigation instead of refetching every time —
            // a page seen in the last 30s renders instantly. Cache is kept 5min
            // after a page unmounts so back/forth is free. Live polling is opt-in
            // per query (only the Dispatch board sets refetchInterval).
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
