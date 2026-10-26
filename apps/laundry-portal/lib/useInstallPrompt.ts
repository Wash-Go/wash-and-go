'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { readDismissed, shouldShowInstallCard, writeDismissed } from './install-prompt';

// The browser's install offer. beforeinstallprompt can fire before React
// mounts the card, so it is captured once at app start (captureInstallPrompt,
// called from the root PwaRegister) and held here.
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let captured = false;

export function captureInstallPrompt() {
  if (captured || typeof window === 'undefined') return;
  captured = true;
  // The inline script in app/layout.tsx catches an offer that fired before
  // hydration and parks it on window.__wgInstall.
  const early = (window as unknown as { __wgInstall?: PromptEvent }).__wgInstall;
  if (early) {
    deferred = early;
    emit();
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own card instead of the mini-infobar
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deferred !== null,
    () => false,
  );
  const [dismissed, setDismissed] = useState(true);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setDismissed(readDismissed(storage()));
    setStandalone(window.matchMedia?.('(display-mode: standalone)').matches ?? false);
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed(storage());
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    const e = deferred;
    deferred = null;
    emit();
    await e.prompt();
    await e.userChoice.catch(() => undefined);
  }, []);

  return { show: shouldShowInstallCard({ canPrompt, dismissed, standalone }), install, dismiss };
}
