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
    // Unit tests render components directly and need no Start runtime. Its
    // client-environment config also pre-bundles React for source files while
    // @tanstack/react-router and @testing-library/react load the plain
    // node_modules copy, so under vitest the two copies break hooks.
    !process.env.VITEST &&
      tanstackStart({
        // Static prerender: the landing page is content-only, so we ship plain
        // HTML from dist/client instead of running the SSR server in production.
        // Any static host/CDN serves it with no serverless function required.
        prerender: {
          enabled: true,
          crawlLinks: true,
          autoSubfolderIndex: true,
          // In-page anchors (/#problem, ...) are the same document as /.
          filter: (page) => !page.path.includes('#'),
        },
        // The old /services, /pricing, /book-order and /my-orders pages were
        // folded into the single investor page; vercel.json redirects them.
        // /404 is written as 404.html, which the host serves for unknown paths.
        pages: [
          { path: '/' },
          { path: '/404', prerender: { outputPath: '/404.html' } },
        ],
      }),
    viteReact(),
  ].filter(Boolean),
})

export default config
