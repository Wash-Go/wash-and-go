import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    process.env.NODE_ENV === 'development' && devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      // Static prerender: the landing page is content-only, so we ship plain
      // HTML from dist/client instead of running the SSR server in production.
      // Any static host/CDN serves it with no serverless function required.
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
      },
      pages: [
        { path: '/' },
        { path: '/services' },
        { path: '/pricing' },
        { path: '/book-order' },
        { path: '/my-orders' },
      ],
    }),
    viteReact(),
  ].filter(Boolean),
})

export default config
