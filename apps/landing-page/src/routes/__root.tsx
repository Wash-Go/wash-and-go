import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import appCss from '../styles/globals.css?url'
import displayFont from '../assets/fonts/archivo-expanded-800-latin.woff2?url'
import { Footer, Navbar } from '../components/layout'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Wash & Go',
      },
      {
        name: 'theme-color',
        content: '#0b3773',
      },
    ],
    links: [
      {
        rel: 'preload',
        href: displayFont,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32' },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
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
