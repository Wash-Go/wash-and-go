import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import lockup from '../../assets/brand/logo-lockup-320.webp'
import { DECK_MAILTO, NAV_SECTIONS } from '../../content/site'
import { ButtonLink } from '../ui'

/** Root-relative so the anchors also work from the 404 page. */
const NAV_LINKS = NAV_SECTIONS.map((section) => ({
  href: `/#${section.id}`,
  label: section.label,
}))

const LINK_CLASS =
  'rounded-md px-3 py-2 text-[0.95rem] font-bold text-ink transition-colors duration-150 hover:bg-brand-sky-tint hover:text-brand-navy'

const MOBILE_MENU_ID = 'mobile-menu'

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)

  // Close on any route change (back/forward, a link to another page).
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
    <header className="sticky top-0 z-50 w-full border-b border-line bg-white">
      <nav
        aria-label="Main"
        className="mx-auto w-full max-w-[1180px] px-4 py-2 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between gap-6">
          <Link
            to="/"
            className="shrink-0 rounded-md transition-opacity hover:opacity-80"
          >
            <img
              src={lockup}
              width={320}
              height={192}
              alt="Wash & Go home"
              className="h-12 w-auto sm:h-14"
            />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={LINK_CLASS}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <ButtonLink href={DECK_MAILTO} variant="secondary" className="px-4">
              Request the deck
            </ButtonLink>
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-md text-ink hover:bg-brand-sky-tint md:hidden"
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

        <div
          id={MOBILE_MENU_ID}
          hidden={!menuOpen}
          className="border-t border-line pt-2 pb-4 md:hidden"
        >
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`${LINK_CLASS} py-3`}
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
          </div>
          <ButtonLink
            href={DECK_MAILTO}
            variant="secondary"
            className="mt-3 w-full"
            onClick={closeMenu}
          >
            Request the deck
          </ButtonLink>
        </div>
      </nav>
    </header>
  )
}
