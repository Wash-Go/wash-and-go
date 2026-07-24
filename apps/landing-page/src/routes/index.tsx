import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import heroImage from '../assets/images/heroes/home-hero.webp'
import seeMoreIcon from '../assets/images/icons/see-more.svg'
import { StatsBanner, FeaturesSection } from '../components/home'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const imageRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const measure = () => {
      if (imageRef.current) {
        setContainerWidth(imageRef.current.offsetWidth)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const notchGap = containerWidth * 0.346 - 16

  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-12 pt-8 sm:pt-10 lg:pt-12">
      <section className="mx-auto w-full max-w-360 px-6 sm:px-8 lg:px-10">
        {/* Title */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-['Unbounded'] text-4xl font-bold leading-[1.05] tracking-tight text-black sm:text-5xl lg:text-6xl">
            Seamless Laundry
            <span className="block">
              <span className="text-[#3D5975]">Anytime,</span>{' '}
              <span className="text-[#D07A29]">Anywhere.</span>
            </span>
          </h1>
          <p className="mt-3 font-['Montserrat'] text-xl italic text-[#222222] sm:text-4xl">
            From Your Door to Fresh & Folded.
          </p>
        </div>

        {/* MOBILE BUTTONS */}
        <div className="mt-6 flex flex-col gap-3 sm:hidden">
          <button
            className="
            w-full rounded-full bg-[#D07A29]
            py-3.5 font-['Montserrat'] text-sm font-semibold text-white
            transition-all duration-150
            hover:bg-[#c46e24] hover:shadow-md
            active:scale-[0.97] active:bg-[#a85d1e] active:shadow-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D07A29] focus-visible:ring-offset-2
          "
            onClick={() => navigate({ to: '/book-order' })}
          >
            Book Laundry Now
          </button>

          <button
            className="
            inline-flex w-full items-center justify-center gap-2
            rounded-full border-2 border-[#D07A29]
            py-3.5 font-['Montserrat'] text-sm font-semibold text-[#D07A29]
            transition-all duration-150
            hover:bg-[#D07A29] hover:text-white hover:[&>img]:brightness-0 hover:[&>img]:invert
            active:scale-[0.97] active:bg-[#a85d1e] active:text-white active:border-[#a85d1e]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D07A29] focus-visible:ring-offset-2
          "
            onClick={() => navigate({ to: '/pricing' })}
          >
            See Pricing
            <img
              src={seeMoreIcon}
              alt=""
              className="h-4 w-4 shrink-0 transition-all duration-150"
            />
          </button>
        </div>

        {/* Hero */}
        <div className="relative mt-6 sm:mt-12">
          <svg width="0" height="0" className="absolute">
            <defs>
              <clipPath id="heroNotch" clipPathUnits="objectBoundingBox">
                <path
                  d="
                  M 0,0
                  L 0.295,0
                  Q 0.327,0 0.327,0.05
                  L 0.327,0.08
                  Q 0.327,0.13 0.359,0.13
                  L 0.641,0.13
                  Q 0.673,0.13 0.673,0.08
                  L 0.673,0.05
                  Q 0.673,0 0.705,0
                  L 1,0 L 1,1 L 0,1 Z
                "
                />
              </clipPath>
            </defs>
          </svg>

          {/* DESKTOP BUTTONS */}
          {notchGap > 0 && (
            <div
              className="absolute left-1/2 z-50 hidden -translate-x-1/2 sm:block pointer-events-auto"
              style={{ top: '8px', width: `${notchGap}px` }}
            >
              <div className="flex w-full items-center gap-2">
                <button
                  className="
                  flex-1 rounded-full bg-[#D07A29]
                  py-2.5 font-['Montserrat'] text-sm font-semibold whitespace-nowrap text-white
                  transition-all duration-150
                   cursor-pointer
                  hover:bg-[#c46e24] hover:shadow-md
                  active:scale-95 active:bg-[#a85d1e] active:shadow-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D07A29] focus-visible:ring-offset-2
                "
                  onClick={() => navigate({ to: '/book-order' })}
                >
                  Book Laundry Now
                </button>

                <button
                  className="
                  inline-flex flex-1 items-center justify-center gap-1.5
                  rounded-full border-2 border-[#D07A29]
                  py-2.5 font-['Montserrat'] text-sm font-semibold whitespace-nowrap text-[#D07A29]
                  transition-all duration-150
                  cursor-pointer
                  hover:bg-[#D07A29] hover:text-white hover:[&>img]:brightness-0 hover:[&>img]:invert
                  active:scale-95 active:bg-[#a85d1e] active:text-white active:border-[#a85d1e]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D07A29] focus-visible:ring-offset-2
                "
                  onClick={() => navigate({ to: '/pricing' })}
                >
                  See Pricing
                  <img
                    src={seeMoreIcon}
                    alt=""
                    className="h-4 w-4 shrink-0 transition-all duration-150"
                  />
                </button>
              </div>
            </div>
          )}

          {/* IMAGE CONTAINER (FIXED) */}
          <div
            ref={imageRef}
            className="overflow-hidden rounded-[3rem] pointer-events-none"
            style={{ clipPath: 'url(#heroNotch)' }}
          >
            <img
              src={heroImage}
              alt="Folded laundry basket in a clean room"
              className="pointer-events-none h-110 w-full object-cover object-center sm:h-130 lg:h-140"
            />
          </div>

          {/* Badge */}
          <div
            className="
            absolute right-3 top-3
            sm:right-6 sm:top-6
            inline-flex items-center gap-1.5 sm:gap-2
            rounded-full bg-[#586779]/80
            px-3 py-1.5 sm:px-4 sm:py-2
            text-white backdrop-blur-sm
          "
          >
            <span className="text-yellow-400 text-sm sm:text-base">★</span>
            <span className="font-['Montserrat'] text-xs sm:text-base font-semibold whitespace-nowrap">
              Local partner shops
            </span>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <div className="mx-auto w-full max-w-360 px-6 sm:px-8 lg:px-10">
        <StatsBanner />
      </div>

      {/* Features Section */}
      <div className="mx-auto w-full max-w-360 px-6 sm:px-8 lg:px-10">
        <FeaturesSection />
      </div>
    </main>
  )
}
