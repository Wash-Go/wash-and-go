import { COMPETITION, MARKET_SIZING, SEGMENTS } from '../../content/site'
import { DataTable, Section, SectionHeading } from '../ui'

export function Market() {
  return (
    <Section id="market">
      <SectionHeading
        id="market"
        eyebrow="Market"
        title="~₱60M–₱110M a year, and no laundry platform in the city."
        lead="Sized two independent ways, bottom-up from the local shop base and top-down from the national market, then reconciled. Both are conservative working estimates pending a field price survey."
      />

      <div className="mt-12 max-w-4xl">
        <DataTable
          caption="Zamboanga City market sizing"
          columns={[
            { label: 'Layer' },
            { label: 'Estimate', numeric: true },
            { label: 'Basis' },
          ]}
          rows={MARKET_SIZING}
          note="The top-down estimate (₱34M–₱46M a year) is a conservative floor: it reflects the formal sector and under-counts Zamboanga’s informal, cash-based shops. The bottom-up estimate (₱64M–₱129M a year) captures that informal base directly. Taken together, the working total addressable market is approximately ₱60M–₱110M per year."
        />
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h3 className="text-xl font-bold text-ink">Who we serve first</h3>
          <dl className="mt-5 border-b border-line">
            {SEGMENTS.map((segment) => (
              <div key={segment.name} className="border-t border-line py-4">
                <dt className="font-bold text-ink">{segment.name}</dt>
                <dd className="mt-1 leading-relaxed text-muted">
                  {segment.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="text-xl font-bold text-ink">Competitive position</h3>
          <dl className="mt-5 border-b border-line">
            {COMPETITION.map((row) => (
              <div key={row.who} className="border-t border-line py-4">
                <dt className="font-bold text-ink">{row.who}</dt>
                <dd className="mt-1 leading-relaxed text-muted">{row.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  )
}
