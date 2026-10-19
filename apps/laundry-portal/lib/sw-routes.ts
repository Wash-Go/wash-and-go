// Which requests the service worker may answer from its API cache. Shared by
// app/sw.ts and its test. Network-first GETs only: writes are never cached and
// upload URLs (short-lived signed links) are excluded. GET /auth/me and
// /shop/onboarding ARE cached, so the gate can open the last-seen queue
// offline; the cache is cleared on sign-out (lib/sign-out.ts).

const NEVER_CACHE = [/^\/uploads(\/|$)/, /^\/auth\/session$/];

export function isCacheableApiGet(url: URL, method: string, selfOrigin: string, apiOrigin: string): boolean {
  if (method !== 'GET') return false;
  let path: string;
  if (url.origin === apiOrigin) path = url.pathname;
  else if (url.origin === selfOrigin && url.pathname.startsWith('/api/')) path = url.pathname.slice(4);
  else return false;
  return !NEVER_CACHE.some((re) => re.test(path));
}

// Cache name, also cleared on sign-out so the next person on a shared phone
// never sees the last shop's queue.
export const API_CACHE = 'wg-api';
