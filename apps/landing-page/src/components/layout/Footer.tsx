import { Link } from '@tanstack/react-router'
import brandingLogo from '../../assets/images/logos/branding.svg'

const FOOTER_NAV = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/book-order', label: 'How It Works' },
  { to: '/my-orders', label: 'Tracking' },
  { to: '/pricing', label: 'Pricing' },
] as const

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2">
            <img src={brandingLogo} alt="Wash & Go Logo" className="h-9 w-auto" />
            <span className="font-['Unbounded'] text-xl font-bold text-gray-900">
              Wash & Go
            </span>
          </div>
          <p className="mt-4 max-w-sm font-['Montserrat'] text-sm leading-relaxed text-gray-600">
            Scheduling-first laundry for Zamboanga City. We coordinate pickup,
            partner-shop washing, and doorstep return — you skip laundry day.
          </p>
          <p className="mt-4 font-['Montserrat'] text-xs text-gray-400">
            A DOST AZUL Hub startup.
          </p>
        </div>

        {/* Explore */}
        <div>
          <h3 className="font-['Unbounded'] text-sm font-bold text-gray-900">
            Explore
          </h3>
          <ul className="mt-4 space-y-2.5">
            {FOOTER_NAV.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="font-['Montserrat'] text-sm text-gray-600 transition-colors hover:text-[#D07A29]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Get the app */}
        <div id="get-the-app">
          <h3 className="font-['Unbounded'] text-sm font-bold text-gray-900">
            Get the App
          </h3>
          <p className="mt-4 font-['Montserrat'] text-sm text-gray-600">
            Booking and order tracking live in the Wash & Go mobile app.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <span className="inline-flex w-fit items-center rounded-full bg-gray-100 px-4 py-2 font-['Montserrat'] text-xs font-medium text-gray-500">
              Google Play — coming soon
            </span>
            <span className="inline-flex w-fit items-center rounded-full bg-gray-100 px-4 py-2 font-['Montserrat'] text-xs font-medium text-gray-500">
              App Store — coming soon
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 sm:flex-row sm:px-8">
          <p className="font-['Montserrat'] text-xs text-gray-500">
            © {new Date().getFullYear()} Wash & Go. All rights reserved.
          </p>
          <p className="font-['Montserrat'] text-xs text-gray-400">
            Serving Zamboanga City
          </p>
        </div>
      </div>
    </footer>
  )
}
