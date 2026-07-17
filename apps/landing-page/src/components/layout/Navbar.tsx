import { Link } from '@tanstack/react-router'
import brandingLogo from '../../assets/images/logos/branding.svg'
import notificationIcon from '../../assets/images/icons/notification.svg'
import profileIcon from '../../assets/images/icons/profile.svg'

export function Navbar() {
  return (
    <header className="sticky top-0 z-1000 z-50 w-full border-b border-gray-100 bg-white">
      <nav className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center">
          {/* LEFT - Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 justify-self-start hover:opacity-80 transition-opacity"
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
          <div className="hidden md:flex items-center bg-[#EEEEEE] rounded-4xl p-1.5 justify-center gap-1 justify-self-center">
            <Link
              to="/"
              className="font-['Montserrat'] text-sm font-medium rounded-full transition-colors"
              activeProps={{
                className:
                  "font-['Montserrat'] text-sm font-medium px-8 py-2.5 rounded-full transition-colors bg-[#D07A29] text-white",
              }}
              inactiveProps={{
                className:
                  "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors text-gray-700 hover:bg-gray-100",
              }}
            >
              Home
            </Link>

            <Link
              to="/services"
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
              Services
            </Link>

            <Link
              to="/book-order"
              className="font-['Montserrat'] text-sm font-medium  rounded-full transition-colors"
              activeProps={{
                className:
                  "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors bg-[#D07A29] text-white",
              }}
              inactiveProps={{
                className:
                  "font-['Montserrat'] text-sm font-medium px-5 py-2.5 rounded-full transition-colors text-gray-700 hover:bg-gray-100",
              }}
            >
              Book Order
            </Link>

            <Link
              to="/my-orders"
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
              My Orders
            </Link>

            <Link
              to="/pricing"
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
              Pricing
            </Link>
          </div>

          {/* RIGHT - User */}
          <div className="hidden md:flex items-center gap-6 justify-self-end">
            <button
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Notifications"
            >
              <img
                src={notificationIcon}
                alt="Notifications"
                className="w-4.5 h-4.75"
              />
            </button>

            <div className="w-px h-6 bg-gray-300"></div>

            <button
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Profile"
            >
              <img src={profileIcon} alt="Profile" className="w-4.5 h-4.5" />
            </button>

            <span className="font-['Montserrat'] text-sm font-medium text-gray-900">
              Welcome, Clyde!
            </span>
          </div>

          {/* MOBILE MENU */}
          <button
            className="justify-self-end md:hidden p-2 text-gray-700 hover:text-blue-600"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
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
