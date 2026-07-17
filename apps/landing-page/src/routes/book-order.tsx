import { createFileRoute } from '@tanstack/react-router'
import { AppCta } from '../components'

export const Route = createFileRoute('/book-order')({
  head: () => ({
    meta: [{ title: 'How It Works — Wash & Go' }],
  }),
  component: HowItWorksPage,
})

/*
 * Public site is onboarding-only (ADR-002): booking happens in the customer
 * app, not here. This page explains the flow (spec §9 + Logistics v1.1) and
 * hands off to the app.
 */
const STEPS = [
  {
    n: '01',
    title: 'Book in the app',
    body: 'Choose Express for urgent loads or Scheduled for a planned pickup window. Confirm your address inside our service area.',
  },
  {
    n: '02',
    title: 'We collect',
    body: 'A rider picks up your laundry at your door — batched onto a route for Scheduled, or dispatched directly for Express.',
  },
  {
    n: '03',
    title: 'Partner shop washes',
    body: 'Your laundry is weighed and processed by a trusted partner shop. The measured weight sets the final price for weight-based services.',
  },
  {
    n: '04',
    title: 'Pay securely',
    body: 'Pay in the app once your laundry is weighed — GCash, Maya, or card. No cash to fumble with at the door.',
  },
  {
    n: '05',
    title: 'Doorstep return',
    body: 'Fresh, folded, and delivered back to you. Track every step and handoff live in the app.',
  },
] as const

function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f5] pb-4 pt-12">
      <section className="mx-auto w-full max-w-5xl px-6 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-['Unbounded'] text-4xl font-bold leading-[1.1] tracking-tight text-black sm:text-5xl">
            From Your Door to{' '}
            <span className="text-[#D07A29]">Fresh & Folded.</span>
          </h1>
          <p className="mt-4 font-['Montserrat'] text-base text-[#444] sm:text-lg">
            Five steps, zero laundry days. Here's how a Wash & Go order flows.
          </p>
        </div>

        <ol className="mt-14 space-y-5">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="flex gap-5 rounded-3xl border border-gray-100 bg-white p-6 sm:p-8"
            >
              <span
                className="font-['Unbounded'] text-3xl font-bold sm:text-4xl"
                style={{ color: i % 2 === 0 ? '#D07A29' : '#3D5975' }}
              >
                {s.n}
              </span>
              <div>
                <h2 className="font-['Unbounded'] text-lg font-bold text-gray-900">
                  {s.title}
                </h2>
                <p className="mt-2 font-['Montserrat'] text-sm leading-relaxed text-gray-600">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-2xl border border-[#3D5975]/20 bg-[#3D5975]/5 p-6 text-center">
          <p className="font-['Montserrat'] text-sm text-[#3D5975]">
            Booking, payment, and live tracking all happen in the Wash & Go
            customer app. This site is where you learn about the service and
            check if we cover your area.
          </p>
        </div>
      </section>

      <AppCta
        title="Book your first pickup"
        subtitle="Download the app to schedule a pickup or send an express order in under a minute."
      />
    </main>
  )
}
