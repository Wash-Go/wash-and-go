import { createFileRoute } from '@tanstack/react-router'
import { NotFound } from '../components/layout'

/*
 * Prerendered to dist/client/404.html (see vite.config.ts), which the static
 * host serves for any unknown path. Client-side misses use the same component
 * through the root route's notFoundComponent.
 */
export const Route = createFileRoute('/404')({
  head: () => ({
    meta: [
      { title: 'Page not found — Wash & Go' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: NotFound,
})
