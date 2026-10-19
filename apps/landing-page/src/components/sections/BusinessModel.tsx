import { REVENUE_STREAMS, UNIT_ECONOMICS } from '../../content/site'
import { DataTable, Section, SectionHeading } from '../ui'

export function BusinessModel() {
  return (
    <Section id="model" band="tint">
      <SectionHeading
        id="model"
        eyebrow="Business model"
        title="Three transparent revenue streams."
        lead="The platform does not profit from the wash itself; that value is remitted to the partner shop. It earns a commission on each order, a delivery fee and a small per-transaction service fee."
      />

      <div className="mt-12 max-w-4xl">
        <DataTable
          caption="Revenue streams"
          columns={[
            { label: 'Revenue stream' },
            { label: 'Rate' },
            { label: 'Charged to' },
          ]}
          rows={REVENUE_STREAMS}
        />
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_15rem] lg:gap-14">
        <div className="max-w-4xl">
          <DataTable
            caption="Unit economics of a representative scheduled order"
            columns={[
              { label: 'Component' },
              { label: 'Amount (₱)', numeric: true },
              { label: 'Flow' },
            ]}
            rows={UNIT_ECONOMICS}
            note="Business-plan figures for a representative scheduled (Tier 1) order of 6 kg at the prevailing Zamboanga rate of ₱25/kg. Unit economics for Express and Scheduled are being validated; fees are admin-editable in the platform."
          />
        </div>
        <dl className="grid content-start gap-8 border-t-2 border-brand-navy pt-6 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="text-sm text-muted">Customer’s total bill</dt>
            <dd className="mt-1 font-mono text-[2.75rem] leading-none font-bold text-ink tabular-nums">
              ₱198
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Net contribution per order</dt>
            <dd className="mt-1 font-mono text-[2.75rem] leading-none font-bold text-brand-navy tabular-nums">
              ₱57
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  )
}
