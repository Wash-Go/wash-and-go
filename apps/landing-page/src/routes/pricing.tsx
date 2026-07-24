import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [{ title: 'Pricing — Wash & Go' }],
  }),
  component: PricingPage,
})

/*
 * No fixed figures — each partner laundry sets its own rate, and the app shows
 * the exact total (wash + delivery + service fee) before the customer confirms.
 * This page explains HOW the price is built, not a firm price list.
 */

const BREAKDOWN = [
  {
    label: 'Wash',
    value: 'Set by the shop',
    note: 'Each partner laundry sets its own rate; weight-based services are priced on the weighed load.',
  },
  {
    label: 'Delivery',
    value: 'By distance',
    note: 'Calculated from your pickup to the nearest partner shop.',
  },
  {
    label: 'Service fee',
    value: 'Flat',
    note: 'A small fee that covers order processing.',
  },
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

        {/* One clear total */}
        <div className="mt-14">
          <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-8 text-center">
            <p className="font-['Unbounded'] text-lg font-bold text-gray-900">
              Wash + Delivery + Service fee ={' '}
              <span className="text-[#D07A29]">your total</span>
            </p>
            <p className="mt-3 font-['Montserrat'] text-sm text-gray-600">
              You see the full breakdown before you confirm. For weight-based
              services the total is re-confirmed after the partner shop weighs
              your laundry — never a surprise at the door.
            </p>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-14 rounded-2xl border border-gray-100 bg-white p-6 text-center">
          <p className="font-['Montserrat'] text-sm text-gray-600">
            Pay <span className="font-semibold text-gray-900">cash on delivery</span>{' '}
            when your clean laundry arrives. In-app payment (GCash, Maya, card) is
            coming soon.
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
