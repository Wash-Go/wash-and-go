import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/my-orders')({
  head: () => ({
    meta: [{ title: 'Order Tracking — Wash & Go' }],
  }),
  component: TrackingPage,
})

/*
 * Public site is onboarding-only (ADR-002): live order tracking lives in the
 * customer app. This page explains what tracking looks like and hands off to
 * the app. Order statuses mirror the backend OrderStatus enum (PLAN.md §2).
 */
const STATUSES = [
  { label: 'Booked', desc: 'Order placed and confirmed' },
  { label: 'Assigned', desc: 'A rider is on the way to you' },
  { label: 'Picked Up', desc: 'Your laundry is with the rider' },
  { label: 'At Shop', desc: 'Weighed and queued at the partner shop' },
  { label: 'Processing', desc: 'Being washed, dried, and folded' },
  { label: 'Out for Return', desc: 'On its way back to your door' },
  { label: 'Delivered', desc: 'Fresh and folded — all done' },
] as const

function TrackingPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-4 pt-12">
      <section className="mx-auto w-full max-w-4xl px-6 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-['Unbounded'] text-4xl font-bold leading-[1.1] tracking-tight text-black sm:text-5xl">
            Know Exactly Where Your{' '}
            <span className="text-[#3D5975]">Laundry Is.</span>
          </h1>
          <p className="mt-4 font-['Montserrat'] text-base text-[#444] sm:text-lg">
            Every pickup, handoff, and return is tracked in real time inside the
            app.
          </p>
        </div>

        {/* Status timeline */}
        <div className="mt-14 rounded-3xl border border-gray-100 bg-white p-6 sm:p-10">
          <ol className="relative space-y-6">
            {STATUSES.map((s, i) => (
              <li key={s.label} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full font-['Montserrat'] text-xs font-bold text-white"
                    style={{
                      backgroundColor: i % 2 === 0 ? '#D07A29' : '#3D5975',
                    }}
                  >
                    {i + 1}
                  </span>
                  {i < STATUSES.length - 1 && (
                    <span className="mt-1 h-6 w-px bg-gray-200" />
                  )}
                </div>
                <div className="pb-1">
                  <h2 className="font-['Unbounded'] text-sm font-bold text-gray-900">
                    {s.label}
                  </h2>
                  <p className="font-['Montserrat'] text-sm text-gray-600">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 rounded-2xl border border-[#D07A29]/20 bg-[#D07A29]/5 p-6 text-center">
          <p className="font-['Montserrat'] text-sm text-[#a85d1e]">
            Live tracking, order history, and receipts are all in the Wash & Go
            customer app. Sign in there to see your active orders.
          </p>
        </div>
      </section>

      <AppCta
        title="Track your orders on the go"
        subtitle="Get real-time status, rider location, and delivery updates in the app."
      />
    </main>
  )
}
