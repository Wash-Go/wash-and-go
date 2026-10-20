'use client';
import { CACHE_OWNER_KEY, cacheOwnerDecision } from './cache-owner';
import { clearGateSnapshot } from './offline-gate';
import { API_CACHE, SW_CLAIM, SW_SIGNED_OUT } from './sw-routes';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Tell the active service worker (if any) to stop or resume storing API
// responses. No worker (dev, first load, unsupported): nothing to tell.
export function postToServiceWorker(type: typeof SW_CLAIM | typeof SW_SIGNED_OUT): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type });
  } catch {
    // Messaging unavailable: the owner check still purges at the next boot.
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
  // The cache now belongs to this uid: let the worker store again.
  postToServiceWorker(SW_CLAIM);
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
