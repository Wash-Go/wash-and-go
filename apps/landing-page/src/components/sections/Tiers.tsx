import { SERVICE_TIERS } from '../../content/site'
import {
  CUSTOMER_CHECKOUT_SCHEDULED,
  CUSTOMER_SCHEDULED_WINDOW,
} from '../../content/screens'
import { DataTable, PhoneShot, Section, SectionHeading } from '../ui'

const RULES = [
  'Load categories: Small, Medium and Large map to weight estimates; the shop weighs the real load at intake.',
  'Express ceiling: 6 kg, admin-editable. At or under goes Express; over goes Scheduled.',
  'Scheduled pickup: the customer picks a window; any load size is accepted.',
  'One booking flow: the tier split happens behind a single booking screen.',
]

export function Tiers() {
  return (
    <Section id="tiers" band="tint">
      <SectionHeading
        id="tiers"
        eyebrow="Two tiers, three services"
        title="Three services on two logistics tiers."
        lead="The customer picks a standard load size and the platform routes it to the right tier. Express (Tier 2, e-bike) handles same-day loads up to 6 kg; larger loads move to Scheduled (Tier 1, Piaggio batch) with a chosen pickup window. Over-threshold Express bookings are steered to Scheduled automatically."
      />

      <div className="mt-12 max-w-4xl">
        <DataTable
          caption="Service categories"
          columns={[
            { label: 'Service' },
            { label: 'What it is' },
            { label: 'Logistics tier' },
          ]}
          rows={SERVICE_TIERS.map((row) => ({
            cells: [
              `${row.service} (${row.market})`,
              row.description,
              row.tier,
            ],
          }))}
        />
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
        <div className="flex gap-5 overflow-x-auto pb-2">
          <PhoneShot shot={CUSTOMER_SCHEDULED_WINDOW} />
          <PhoneShot shot={CUSTOMER_CHECKOUT_SCHEDULED} />
        </div>
        <div className="max-w-xl">
          <h3 className="text-xl font-bold text-ink">The rules today</h3>
          <ul className="mt-4 space-y-3">
            {RULES.map((rule) => (
              <li key={rule} className="flex gap-3 leading-relaxed text-ink">
                <span
                  aria-hidden="true"
                  className="mt-3 h-0.5 w-4 shrink-0 bg-brand-navy"
                />
                {rule}
              </li>
            ))}
          </ul>
          <h3 className="mt-10 text-xl font-bold text-ink">The fleet plan</h3>
          <p className="mt-3 leading-relaxed text-ink">
            <strong className="font-bold">Plan, not yet in operation:</strong> a
            hybrid model for Tier 1. Company-operated Piaggio Ape Cargo vehicles
            serve high-demand areas to set baseline reliability, and qualified
            third-party Piaggio operators are onboarded to add capacity as
            demand grows, keeping capital needs low as new zones open.
          </p>
        </div>
      </div>
    </Section>
  )
}
