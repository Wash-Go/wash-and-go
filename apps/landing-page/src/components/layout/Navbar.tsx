import { Link } from '@tanstack/react-router'
import brandingLogo from '../../assets/images/logos/branding.svg'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/book-order', label: 'How It Works' },
  { to: '/my-orders', label: 'Tracking' },
  { to: '/pricing', label: 'Pricing' },
] as const

export function Navbar() {
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
                className="font-['Montserrat'] text-sm font-medium rounded-full transition-colors"
                activeProps={{
                  className:
                    "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors bg-[#D07A29] text-white",
                }}
                inactiveProps={{
                  className:
                    "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors text-gray-700 hover:bg-gray-100",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* RIGHT - App CTA (public site is onboarding-only; no auth here) */}
          <div className="hidden items-center justify-self-end md:flex">
            <a
              href="#get-the-app"
              className="rounded-full bg-[#3D5975] px-6 py-2.5 font-['Montserrat'] text-sm font-semibold text-white transition-colors hover:bg-[#334c63]"
            >
              Get the App
            </a>
          </div>

          {/* MOBILE MENU */}
          <button
            className="justify-self-end p-2 text-gray-700 hover:text-blue-600 md:hidden"
            aria-label="Open menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  )
}
