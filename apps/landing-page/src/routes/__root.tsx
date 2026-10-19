import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import appCss from '../styles/globals.css?url'
import displayFont from '../assets/fonts/archivo-expanded-800-latin.woff2?url'
import { Footer, Navbar, NotFound } from '../components/layout'
import {
  CANONICAL_URL,
  OG_IMAGE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from '../content/site'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#0b3773' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: SITE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:url', content: CANONICAL_URL },
      { property: 'og:image', content: OG_IMAGE_URL },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'The Wash & Go whale logo with the tagline.',
      },
      { property: 'og:locale', content: 'en_PH' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE_URL },
    ],
    links: [
      {
        rel: 'preload',
        href: displayFont,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: CANONICAL_URL },
      { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32' },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-brand-navy"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </div>
        <Scripts />
      </body>
    </html>
  )
}
