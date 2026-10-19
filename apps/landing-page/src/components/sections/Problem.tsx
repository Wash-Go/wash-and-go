import { PROBLEM_STATS, SHOP_SIDE } from '../../content/site'
import { Section, SectionHeading } from '../ui'

export function Problem() {
  return (
    <Section id="problem" band="tint">
      <SectionHeading
        id="problem"
        eyebrow="The problem"
        title="Laundry is a daily burden. The shops that do it are offline."
        lead="Laundry competes with work, study, rest and productivity, and demand for laundry services is driven largely by necessity."
      />

      <ol className="mt-12 border-b border-line">
        {PROBLEM_STATS.map((stat) => (
          <li
            key={stat.figure}
            className="grid gap-3 border-t border-line py-7 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-10"
          >
            <p className="font-mono text-[2.75rem] leading-none font-bold text-brand-navy tabular-nums">
              {stat.figure}
              {stat.unit ? (
                <span className="ml-2 text-xl font-medium">{stat.unit}</span>
              ) : null}
            </p>
            <div className="max-w-2xl">
              <p className="text-lg leading-relaxed text-ink">{stat.text}</p>
              <p className="mt-2 text-sm text-muted">Source: {stat.source}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-14 grid gap-8 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-10">
        <h3 className="text-xl font-bold text-ink">On the shop side</h3>
        <div className="max-w-2xl">
          <dl className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <dt className="text-sm text-muted">
                Laundry shops in Zamboanga City
              </dt>
              <dd className="mt-1 font-mono text-[2.75rem] leading-none font-bold text-brand-navy tabular-nums">
                ~{SHOP_SIDE.shops}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">City-average rate</dt>
              <dd className="mt-1 font-mono text-[2.75rem] leading-none font-bold text-brand-navy tabular-nums">
                {SHOP_SIDE.rate}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-lg leading-relaxed text-ink">
            Local shops are fragmented and digitally invisible: paper order
            tracking, cash-only payment, and machine capacity left idle in
            off-peak hours. Zamboanga City has no laundry platform; the market
            is untapped digitally. A marketplace can fill partner shops’
            capacity predictably, so both the shop and the customer gain through
            better planning and lower costs.
          </p>
          <p className="mt-2 text-sm text-muted">Source: {SHOP_SIDE.source}</p>
        </div>
      </div>
    </Section>
  )
}
