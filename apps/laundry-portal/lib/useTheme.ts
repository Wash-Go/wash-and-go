'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { resolveTheme, THEME_KEY, type ThemeName } from './theme';

// The portal theme (B8): light unless dark was chosen on this device. The
// pre-paint script in app/layout.tsx applies a stored choice; this hook reads
// <html data-theme> and switches it, persisting to localStorage.
const EVENT = 'wg-theme-change';

function current(): ThemeName {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function subscribe(l: () => void) {
  window.addEventListener(EVENT, l);
  window.addEventListener('storage', l);
  return () => {
    window.removeEventListener(EVENT, l);
    window.removeEventListener('storage', l);
  };
}

export function applyTheme(t: ThemeName) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

export function useTheme(): [ThemeName, (t: ThemeName) => void] {
  const theme = useSyncExternalStore(subscribe, current, () => 'light' as ThemeName);
  const set = useCallback((t: ThemeName) => {
    const next = resolveTheme(t);
    try {
      if (next === 'dark') window.localStorage.setItem(THEME_KEY, 'dark');
      else window.localStorage.removeItem(THEME_KEY);
    } catch {
      /* the choice still applies for this visit */
    }
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [theme, set];
}
