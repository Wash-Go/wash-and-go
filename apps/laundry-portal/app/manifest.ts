import type { MetadataRoute } from 'next';

// Installable PWA (plan Decisions, 2026-10-19). Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Wash & Go Partner',
    short_name: 'Wash & Go',
    description: 'Work your laundry queue, weigh orders and track payouts.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#0B3773',
    background_color: '#FFFFFF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
