'use client';
import type { QueryClient } from '@tanstack/react-query';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { API_CACHE } from './sw-routes';

// Sign out and forget this shop: Firebase session, in-memory queries, and the
// service worker's API cache, so the next person on a shared phone never sees
// the last shop's queue offline.
export async function signOutEverywhere(qc: QueryClient): Promise<void> {
  await signOut(auth).catch(() => undefined);
  qc.clear();
  try {
    if (typeof caches !== 'undefined') await caches.delete(API_CACHE);
  } catch {
    // No Cache Storage (private mode): nothing cached to clear.
  }
}
