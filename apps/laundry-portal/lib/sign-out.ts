'use client';
import type { QueryClient } from '@tanstack/react-query';
import { signOut } from 'firebase/auth';
import { deleteApiCache, forgetCacheOwner } from './cache-owner-effect';
import { auth } from './firebase';

// Sign out and forget this shop: in-flight and polling queries, the Firebase
// session, in-memory data, the service worker's API cache and the gate
// snapshot, so the next person on a shared phone never sees the last shop's
// queue offline. cancelQueries cannot abort a fetch already inside the
// service worker, so the cache is deleted again after sign-out, and the
// owner check on the next sign-in (claimApiCache) purges anything that still
// lands late.
export async function signOutEverywhere(qc: QueryClient): Promise<void> {
  await qc.cancelQueries();
  await deleteApiCache();
  await signOut(auth).catch(() => undefined);
  qc.clear();
  forgetCacheOwner();
  await deleteApiCache();
}
