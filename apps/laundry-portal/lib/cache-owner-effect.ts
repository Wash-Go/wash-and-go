'use client';
import { CACHE_OWNER_KEY, cacheOwnerDecision } from './cache-owner';
import { clearGateSnapshot } from './offline-gate';
import { API_CACHE } from './sw-routes';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function deleteApiCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') await caches.delete(API_CACHE);
  } catch {
    // No Cache Storage (private mode): nothing cached.
  }
}

// Run before the gate reads anything: purge the API cache and the gate
// snapshot when the cache belongs to someone else (or to no one).
export async function claimApiCache(uid: string): Promise<void> {
  const store = storage();
  let recorded: string | null = null;
  try {
    recorded = store?.getItem(CACHE_OWNER_KEY) ?? null;
  } catch {
    recorded = null;
  }
  const { purge, record } = cacheOwnerDecision(recorded, uid);
  if (purge) {
    await deleteApiCache();
    clearGateSnapshot(store);
  }
  try {
    store?.setItem(CACHE_OWNER_KEY, record);
  } catch {
    // Unrecorded: the next boot purges again, which is safe.
  }
}

// Sign-out: forget the owner and the gate snapshot.
export function forgetCacheOwner(): void {
  const store = storage();
  clearGateSnapshot(store);
  try {
    store?.removeItem(CACHE_OWNER_KEY);
  } catch {
    // Nothing to forget.
  }
}
