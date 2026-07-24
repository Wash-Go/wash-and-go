import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/services')({
  head: () => ({
    meta: [{ title: 'Services — Wash & Go' }],
  }),
  component: ServicesPage,
})

/*
 * Service catalogue. Each partner laundry sets its own rates — we show the exact
 * price at booking (wash + delivery + service fee), and weight-based services are
 * finalized at the shop's weigh-in. No fixed figures here on purpose.
 */
const SERVICES = [
  {
    name: 'Wash, Dry & Fold',
    blurb: 'Everyday laundry washed, dried, and neatly folded.',
    pricing: 'Per kg · shop-set',
    note: 'Priced on the weighed load',
  },
  {
    name: 'Wash + Iron',
    blurb: 'Washed, dried, and pressed — ready to wear.',
    pricing: 'Per load · shop-set',
    note: 'Pressed on hangers',
  },
  {
    name: 'Dry Cleaning',
    blurb: 'Solvent cleaning for delicate and structured garments.',
    pricing: 'Per piece · shop-set',
    note: 'Per-garment pricing',
  },
  {
    name: 'Wedding Gown Care',
    blurb: 'Specialist cleaning and preservation for gowns.',
    pricing: 'Quoted by the shop',
    note: 'Confirmed before processing',
  },
] as const

const SERVICE_TYPES = [
  {
    tag: 'Express',
    color: '#D07A29',
    title: 'Express',
    points: [
      'Same-day, on-demand pickup for light loads (up to 6 kg)',
      'Straight to a nearby partner shop, priority processing',
      'Best when you need it back fast',
    ],
  },
  {
    tag: 'Scheduled',
    color: '#3D5975',
    title: 'Scheduled',
    points: [
      'Pick a day and time window that suits you',
      'Any load size — batched routes keep delivery efficient',
      'Best for regular, planned laundry',
    ],
  },
  {
    tag: 'Business',
    color: '#2F7D5B',
    title: 'Business',
    points: [
      'For hotels, dorms, restaurants, offices & more',
      'One-time or recurring scheduled pickups',
      'Built for larger, predictable volumes',
    ],
  },
] as const

function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-4 pt-12">
      <section className="mx-auto w-full max-w-6xl px-6 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-['Unbounded'] text-4xl font-bold leading-[1.1] tracking-tight text-black sm:text-5xl">
            Clean Clothes Have{' '}
            <span className="text-[#D07A29]">Never Been</span> This Easy.
          </h1>
          <p className="mt-4 font-['Montserrat'] text-base text-[#444] sm:text-lg">
            One coordination layer, three ways to get it done — pick the one that
            fits your day.
          </p>
        </div>

        {/* Service types */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {SERVICE_TYPES.map((t) => (
            <div
              key={t.tag}
              className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              <span
                className="inline-flex items-center rounded-full px-4 py-1.5 font-['Montserrat'] text-xs font-semibold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.tag}
              </span>
              <h2 className="mt-4 font-['Unbounded'] text-xl font-bold text-gray-900">
                {t.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {t.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 font-['Montserrat'] text-sm text-gray-600"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Catalogue */}
        <div className="mt-16">
          <h2 className="text-center font-['Unbounded'] text-2xl font-bold text-gray-900 sm:text-3xl">
            What We Handle
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-gray-100 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-['Unbounded'] text-lg font-bold text-gray-900">
                    {s.name}
                  </h3>
                  <span className="shrink-0 font-['Montserrat'] text-sm font-semibold text-[#D07A29]">
                    {s.pricing}
                  </span>
                </div>
                <p className="mt-2 font-['Montserrat'] text-sm text-gray-600">
                  {s.blurb}
                </p>
                <p className="mt-3 font-['Montserrat'] text-xs text-gray-400">
                  {s.note}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center font-['Montserrat'] text-xs text-gray-400">
            Each partner laundry sets its own rates. You always see the exact
            price — wash + delivery + service fee — before you confirm, and
            weight-based services are finalized at the shop's weigh-in.
          </p>
        </div>
      </section>

      <AppCta />
    </main>
  )
}
