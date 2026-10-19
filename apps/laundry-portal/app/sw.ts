/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist';
import { API_CACHE, isCacheableApiGet } from '../lib/sw-routes';

// Service worker (Serwist). Built to public/sw.js by @serwist/next in
// production builds only; registered by components/PwaRegister.tsx with the
// API base URL in the query string (the SW bundle has no NEXT_PUBLIC_* env).
//
// - Precache: Next's static chunks (the app shell), public/ assets and the
//   branded /~offline page.
// - API GETs: network-first with a short life, so the last-seen queue renders
//   offline behind the StaleBanner. Writes are never cached (runtime caching
//   only matches GET); identity (/auth/*, /shop/onboarding), signed upload
//   links and other cross-origin requests (Firebase) go straight to the
//   network. The cache is purged when the signed-in uid changes
//   (lib/cache-owner.ts) and on sign-out.
// - Pages: Serwist's defaults (network-first); a page never opened online
//   falls back to /~offline.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const apiParam = new URL(self.location.href).searchParams.get('api');
let API_ORIGIN = self.location.origin;
try {
  if (apiParam) API_ORIGIN = new URL(apiParam).origin;
} catch {
  // Bad param: only same-origin /api would be cached.
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) => isCacheableApiGet(url, request.method, self.location.origin, API_ORIGIN),
      handler: new NetworkFirst({
        cacheName: API_CACHE,
        networkTimeoutSeconds: 8,
        plugins: [
          // Store the URL only: the original Request carries the bearer token.
          { cacheKeyWillBeUsed: async ({ request }) => new Request(request.url) },
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
    // Anything else on the API origin (signed upload links) and every other
    // cross-origin request: network only, never stored.
    { matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/~offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
