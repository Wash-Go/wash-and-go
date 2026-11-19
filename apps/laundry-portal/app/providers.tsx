'use client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { markLive } from '../lib/live';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // A success while the browser says it's online came from the API, not
          // the service worker cache: that is what "updated N s ago" measures.
          onSuccess: () => {
            if (typeof navigator !== 'undefined' && navigator.onLine) markLive();
          },
        }),
        defaultOptions: {
          // offlineFirst: fire the request even offline so the service worker
          // can answer from its cache (last-seen queue); retries pause offline.
          queries: { refetchInterval: 5000, staleTime: 2000, networkMode: 'offlineFirst' },
          mutations: { networkMode: 'offlineFirst' },
        },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
