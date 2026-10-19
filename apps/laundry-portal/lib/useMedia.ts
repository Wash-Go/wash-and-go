'use client';
import { useSyncExternalStore } from 'react';

// True when the media query matches; false during SSR and the first paint.
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', l);
      return () => m.removeEventListener('change', l);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP = '(min-width: 1024px)';
