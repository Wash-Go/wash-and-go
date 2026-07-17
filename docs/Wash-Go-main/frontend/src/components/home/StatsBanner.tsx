import { useEffect, useState } from 'react'
import laundryCleanedIcon from '../../assets/images/icons/laundry-cleaned.svg'
import orderedServiceIcon from '../../assets/images/icons/ordered-service.svg'
import satisfiedClientsIcon from '../../assets/images/icons/satisfied-clients.svg'

type StatItem = {
  icon: string
  number: string
  description: string
}

type StatCardProps = StatItem & {
  isActive: boolean
}

const STATS: StatItem[] = [
  {
    icon: laundryCleanedIcon,
    number: '100,000+',
    description: 'Pounds of laundry cleaned',
  },
  {
    icon: orderedServiceIcon,
    number: '500+',
    description: 'Orders Serviced',
  },
  {
    icon: satisfiedClientsIcon,
    number: '1000+',
    description: 'Satisfied Clients',
  },
]

const ACTIVE_ICON_FILTER =
  'brightness(0) saturate(100%) invert(17%) sepia(84%) saturate(2192%) hue-rotate(191deg) brightness(91%) contrast(101%)'

function StatCard({ icon, number, description, isActive }: StatCardProps) {
  return (
    <div className="flex w-full justify-center">
      <div
        className={`inline-flex items-center justify-center gap-4 rounded-[1.25rem] px-3.5 py-3 transition-all duration-700 sm:px-5 sm:py-4 ${
          isActive ? 'bg-[#e5e8ec]' : 'bg-transparent'
        }`}
      >
        <img
          src={icon}
          alt=""
          className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
          style={{ filter: isActive ? ACTIVE_ICON_FILTER : undefined }}
        />
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <span
            className={`font-['Unbounded'] text-xl leading-tight transition-all duration-700 sm:text-2xl lg:text-3xl ${
              isActive
                ? 'font-extrabold text-[#004375]'
                : 'font-bold text-black'
            }`}
          >
            {number}
          </span>
          <p
            className={`whitespace-nowrap font-['Montserrat'] text-[0.7rem] leading-snug transition-all duration-700 sm:text-sm ${
              isActive
                ? 'font-semibold text-[#004375]'
                : 'font-normal text-black'
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function StatsBanner() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STATS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="mt-10 w-full">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {STATS.map((stat, index) => (
          <StatCard
            key={stat.description}
            {...stat}
            isActive={activeIndex === index}
          />
        ))}
      </div>
    </section>
  )
}
