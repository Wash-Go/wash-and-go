'use client';
import { useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';
import { captureInstallPrompt } from '../lib/useInstallPrompt';

// Registers the Serwist service worker (production builds only; @serwist/next
// disables it in dev) and starts listening for the browser's install offer.
export function PwaRegister() {
  useEffect(() => {
    captureInstallPrompt();
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register(`/sw.js?api=${encodeURIComponent(API_BASE_URL)}`, { scope: '/' })
      .catch((e) => console.error('[pwa] service worker registration failed', e));
  }, []);
  return null;
}
