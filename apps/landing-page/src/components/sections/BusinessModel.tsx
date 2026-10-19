import { REVENUE_STREAMS } from '../../content/site'
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
    </Section>
  )
}
