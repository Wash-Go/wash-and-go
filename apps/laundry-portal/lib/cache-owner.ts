// Who the service worker's API cache (wg-api) belongs to. The cache is keyed by
// URL alone, so before anything reads it the signed-in identity is compared
// with the recorded owner; on any mismatch (another account, a session that
// ended in another tab, a late response after sign-out) the cache and the
// gate snapshot are purged. Pure decision here; the effect is in
// lib/cache-owner-effect.ts.

export const CACHE_OWNER_KEY = 'wg-portal-cache-owner';

// One identity string for both auth paths. A real Firebase user wins over the
// dev stub, as on the API (bearer beats x-dev-uid).
export function sessionUid(user: { uid: string } | null | undefined, devUid: string | undefined): string | null {
  if (user) return `fb:${user.uid}`;
  if (devUid) return `dev:${devUid}`;
  return null;
}

// No owner on record means nothing in the cache can be trusted (it may hold a
// late write from the previous session), so that purges too.
export function cacheOwnerDecision(recorded: string | null, current: string): { purge: boolean; record: string } {
  return { purge: recorded !== current, record: current };
}
