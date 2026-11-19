// Which requests the service worker may answer from its API cache. Shared by
// app/sw.ts and its test. Network-first GETs only: writes are never cached;
// upload URLs (short-lived signed links) and identity (/auth/*,
// /shop/onboarding) are excluded. Offline, the gate uses its own uid-checked
// snapshot (lib/offline-gate.ts) instead. The cache is purged whenever the
// signed-in uid changes (lib/cache-owner.ts) and on sign-out (lib/sign-out.ts).

const NEVER_CACHE = [/^\/uploads(\/|$)/, /^\/auth(\/|$)/, /^\/shop\/onboarding(\/|$)/];

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

// Page → worker messages. Sign-out posts SW_SIGNED_OUT: the worker stops
// storing API responses, so a request that was already in flight cannot
// recreate the cache after sign-out deleted it. The next sign-in's cache
// claim (lib/cache-owner-effect.ts) posts SW_CLAIM and storing resumes.
export const SW_SIGNED_OUT = 'wg-signed-out';
export const SW_CLAIM = 'wg-claim';

export function swControl(data: unknown): 'signed-out' | 'claim' | null {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  if (type === SW_SIGNED_OUT) return 'signed-out';
  if (type === SW_CLAIM) return 'claim';
  return null;
}
