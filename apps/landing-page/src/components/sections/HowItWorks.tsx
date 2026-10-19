import { ORDER_STEPS } from '../../content/site'
import {
  CUSTOMER_CHECKOUT_EXPRESS,
  CUSTOMER_DASHBOARD,
  CUSTOMER_LOAD_SIZE,
  PORTAL_ORDER_QUEUE,
  RIDER_JOB_BOARD,
} from '../../content/screens'
import { DesktopShot, PhoneShot, Section, SectionHeading } from '../ui'

const PHONES = [
  CUSTOMER_DASHBOARD,
  CUSTOMER_LOAD_SIZE,
  CUSTOMER_CHECKOUT_EXPRESS,
  RIDER_JOB_BOARD,
]

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading
        id="how-it-works"
        eyebrow="How it works"
        title="One order, one chain of custody."
        lead="The customer never picks a shop: the system resolves the nearest one and prices the order upfront. Every handoff after that is recorded."
      />

      <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER_STEPS.map((step, i) => (
          <li key={step.title} className="border-t-2 border-brand-sky pt-4">
            <p className="font-mono text-sm font-bold text-brand-navy tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-2 text-xl font-bold text-ink">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
          </li>
        ))}
      </ol>

      <div
        role="region"
        aria-label="Customer and rider app screens"
        tabIndex={0}
        className="-mx-4 mt-16 flex snap-x gap-6 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {PHONES.map((shot) => (
          <PhoneShot key={shot.src} shot={shot} className="snap-start" />
        ))}
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-ink">Weigh, price, process</h3>
          <p className="mt-3 leading-relaxed text-muted">
            The partner shop runs everything from a browser. It enters the real
            weight, previews the recomputed price and confirms it, then moves
            the order from at-shop to washing to ready-for-return. A shop only
            ever sees its own orders.
          </p>
        </div>
        <DesktopShot shot={PORTAL_ORDER_QUEUE} />
      </div>
    </Section>
  )
}
