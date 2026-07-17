import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/services')({
  head: () => ({
    meta: [{ title: 'Services — Wash & Go' }],
  }),
  component: ServicesPage,
})

/*
 * Service catalogue from spec §8 (Zamboanga rates). All rates are PROPOSED /
 * indicative — the founder rate card is not approved. Per-shop pricing may
 * vary; final price is set at weigh-in for weight-based services.
 */
const SERVICES = [
  {
    name: 'Wash, Dry & Fold',
    blurb: 'Everyday laundry washed, dried, and neatly folded.',
    indicative: '≈ ₱25 / kg',
    note: 'Typical range ₱22–30 / kg',
  },
  {
    name: 'Wash + Iron',
    blurb: 'Washed, dried, and pressed — ready to wear.',
    indicative: '≈ ₱220–280 / 8 kg',
    note: 'Pressed on hangers',
  },
  {
    name: 'Dry Cleaning',
    blurb: 'Solvent cleaning for delicate and structured garments.',
    indicative: '≈ ₱80–150 / piece',
    note: 'Per-garment pricing',
  },
  {
    name: 'Wedding Gown Care',
    blurb: 'Specialist cleaning and preservation for gowns.',
    indicative: '≈ ₱500–1,200 / piece',
    note: 'Quote confirmed by the shop',
  },
] as const

const SERVICE_TYPES = [
  {
    tag: 'Scheduled',
    color: '#3D5975',
    title: 'Scheduled Service',
    points: [
      'Pick a day and time window that suits you',
      'Batched with nearby pickups for a lower delivery fee',
      'Best for regular, planned laundry',
    ],
  },
  {
    tag: 'Express',
    color: '#D07A29',
    title: 'Express Service',
    points: [
      'On-demand pickup for urgent loads',
      'Direct-to-shop, priority processing',
      'Faster turnaround at a premium fee',
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
            One coordination layer, two ways to get it done — pick the pace that
            fits your day.
          </p>
        </div>

        {/* Service types */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
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
                    {s.indicative}
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
            Indicative Zamboanga rates. Final price for weight-based services is
            set by the partner shop's measured weight at weigh-in.
          </p>
        </div>
      </section>

      <AppCta />
    </main>
  )
}
