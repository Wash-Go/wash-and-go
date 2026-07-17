import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [{ title: 'Pricing — Wash & Go' }],
  }),
  component: PricingPage,
})

/*
 * PRICING IS PROPOSED / INDICATIVE ONLY.
 * Per BUSINESS_RULES_PROPOSED (Notion): the 12% commission, ₱40 scheduled
 * delivery, express fee range, and ₱7 service fee are planning assumptions.
 * The founders must approve the rate card. This page shows how pricing works
 * transparently, with figures clearly marked as indicative — do NOT present
 * as a firm price list until the rate card is approved.
 */

const BREAKDOWN = [
  {
    label: 'Wash value',
    value: '≈ ₱25 / kg',
    note: 'Set by your chosen service and the shop’s weigh-in',
  },
  {
    label: 'Delivery fee',
    value: '₱40 · Scheduled',
    note: '₱65–80 for Express (premium, on-demand)',
  },
  {
    label: 'Service fee',
    value: '₱7 flat',
    note: 'Covers order processing',
  },
] as const

const EXAMPLE = [
  { label: 'Wash, dry & fold — 6 kg', amount: '₱150' },
  { label: 'Delivery (Scheduled)', amount: '₱40' },
  { label: 'Service fee', amount: '₱7' },
] as const

function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-4 pt-12">
      <section className="mx-auto w-full max-w-4xl px-6 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-['Unbounded'] text-4xl font-bold leading-[1.1] tracking-tight text-black sm:text-5xl">
            Simple, <span className="text-[#D07A29]">Transparent</span> Pricing.
          </h1>
          <p className="mt-4 font-['Montserrat'] text-base text-[#444] sm:text-lg">
            You see every line before you pay. No surprises at the door.
          </p>
        </div>

        {/* Proposed-rates disclaimer */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="font-['Montserrat'] text-xs text-amber-800">
            <span className="font-semibold">Indicative rates.</span> Figures
            below are proposed and pending final approval. Weight-based prices
            are confirmed by the partner shop’s measured weight at weigh-in.
          </p>
        </div>

        {/* How pricing is built */}
        <div className="mt-12">
          <h2 className="text-center font-['Unbounded'] text-2xl font-bold text-gray-900">
            How Your Price Is Built
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {BREAKDOWN.map((b) => (
              <div
                key={b.label}
                className="rounded-2xl border border-gray-100 bg-white p-6 text-center"
              >
                <p className="font-['Montserrat'] text-xs font-medium uppercase tracking-wide text-gray-400">
                  {b.label}
                </p>
                <p className="mt-2 font-['Unbounded'] text-xl font-bold text-[#3D5975]">
                  {b.value}
                </p>
                <p className="mt-3 font-['Montserrat'] text-xs text-gray-500">
                  {b.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Worked example */}
        <div className="mt-14">
          <h2 className="text-center font-['Unbounded'] text-2xl font-bold text-gray-900">
            An Example Order
          </h2>
          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-gray-100 bg-white p-8">
            <ul className="space-y-3">
              {EXAMPLE.map((e) => (
                <li
                  key={e.label}
                  className="flex items-center justify-between font-['Montserrat'] text-sm text-gray-600"
                >
                  <span>{e.label}</span>
                  <span className="font-medium text-gray-900">{e.amount}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="font-['Unbounded'] text-sm font-bold text-gray-900">
                Total
              </span>
              <span className="font-['Unbounded'] text-xl font-bold text-[#D07A29]">
                ₱197
              </span>
            </div>
            <p className="mt-3 font-['Montserrat'] text-xs text-gray-400">
              6 kg wash, dry &amp; fold on Scheduled service. Express delivery
              would replace the ₱40 delivery fee with a ₱65–80 premium fee.
            </p>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-14 rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="font-['Montserrat'] text-sm text-gray-600">
            Pay securely in the app with{' '}
            <span className="font-semibold text-gray-900">GCash</span>,{' '}
            <span className="font-semibold text-gray-900">Maya</span>, or{' '}
            <span className="font-semibold text-gray-900">card</span> — after
            your laundry is weighed, never before.
          </p>
        </div>
      </section>

      <AppCta
        title="See your exact price before you pay"
        subtitle="The app shows a full breakdown the moment your laundry is weighed."
      />
    </main>
  )
}
