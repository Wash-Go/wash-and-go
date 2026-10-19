'use client';
import { useSyncExternalStore } from 'react';

// When the portal last heard from the API over a live connection. The header's
// "updated N s ago" and the offline banner read this, not react-query's
// dataUpdatedAt: offline, the service worker answers from its cache and that
// would look brand new. Persisted so a reload while offline still knows.
const KEY = 'wg-portal-last-live';
let last: number | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const v = Number(window.localStorage.getItem(KEY));
    last = Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    last = null;
  }
}

export function markLive(at = Date.now()) {
  load();
  last = at;
  try {
    window.localStorage.setItem(KEY, String(at));
  } catch {
    // In-memory only this session.
  }
  listeners.forEach((l) => l());
}

export function useLastLive(): number | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return last;
    },
    () => null,
  );
}

function subscribeOnline(l: () => void) {
  window.addEventListener('online', l);
  window.addEventListener('offline', l);
  return () => {
    window.removeEventListener('online', l);
    window.removeEventListener('offline', l);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

// A clock that ticks every `ms`, for relative times.
let now = Date.now();
const tickers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
export function useNow(): number {
  return useSyncExternalStore(
    (l) => {
      tickers.add(l);
      if (!timer) {
        timer = setInterval(() => {
          now = Date.now();
          tickers.forEach((t) => t());
        }, 1000);
      }
      return () => {
        tickers.delete(l);
        if (!tickers.size && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    () => now,
    () => 0,
  );
}
