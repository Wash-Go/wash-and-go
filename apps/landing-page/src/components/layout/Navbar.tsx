import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import brandingLogo from '../../assets/images/logos/branding.svg'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/book-order', label: 'How It Works' },
  { to: '/my-orders', label: 'Tracking' },
  { to: '/pricing', label: 'Pricing' },
] as const

const LINK_BASE =
  "font-['Montserrat'] text-sm font-medium rounded-full transition-colors"
const LINK_ACTIVE = {
  className:
    "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors bg-[#D07A29] text-white",
}
const LINK_INACTIVE = {
  className:
    "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors text-gray-700 hover:bg-gray-100",
}
const APP_CTA_CLASS =
  "rounded-full bg-[#3D5975] px-6 py-2.5 font-['Montserrat'] text-sm font-semibold text-white transition-colors hover:bg-[#334c63]"

const MOBILE_MENU_ID = 'mobile-menu'

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)

  // Close on any route change (menu link, back/forward, an in-page CTA).
  // Resetting during render, not in an effect, means the new page is never
  // painted with the menu still open.
  const [menuPathname, setMenuPathname] = useState(pathname)
  if (menuPathname !== pathname) {
    setMenuPathname(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
      <nav className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center">
          {/* LEFT - Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 justify-self-start transition-opacity hover:opacity-80"
          >
            <img
              src={brandingLogo}
              alt="Wash & Go Logo"
              className="h-10 w-auto"
            />
            <span className="font-['Unbounded'] text-2xl font-bold text-gray-900">
              Wash & Go
            </span>
          </Link>

          {/* CENTER - Navigation */}
          <div className="hidden items-center justify-center gap-1 justify-self-center rounded-4xl bg-[#EEEEEE] p-1.5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={LINK_BASE}
                activeProps={LINK_ACTIVE}
                inactiveProps={LINK_INACTIVE}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* RIGHT - App CTA (public site is onboarding-only; no auth here) */}
          <div className="hidden items-center justify-self-end md:flex">
            <a href="#get-the-app" className={APP_CTA_CLASS}>
              Get the App
            </a>
          </div>

          {/* MOBILE MENU TOGGLE */}
          <button
            ref={toggleRef}
            type="button"
            className="justify-self-end p-2 text-gray-700 hover:text-blue-600 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'
                }
              />
            </svg>
          </button>
        </div>

        {/* MOBILE MENU */}
        <div id={MOBILE_MENU_ID} hidden={!menuOpen} className="mt-4 md:hidden">
          <div className="flex flex-col gap-1 rounded-4xl bg-[#EEEEEE] p-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={LINK_BASE}
                activeProps={LINK_ACTIVE}
                inactiveProps={LINK_INACTIVE}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <a
            href="#get-the-app"
            className={`mt-3 block text-center ${APP_CTA_CLASS}`}
            onClick={closeMenu}
          >
            Get the App
          </a>
        </div>
      </nav>
    </header>
  )
}
