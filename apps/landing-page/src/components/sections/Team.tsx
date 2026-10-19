import { INCUBATOR_LINE, TEAM } from '../../content/site'
import { Section, SectionHeading } from '../ui'

export function Team() {
  return (
    <Section id="team">
      <SectionHeading
        id="team"
        eyebrow="Team"
        title="The team behind the alpha."
      />
      <ul className="mt-12 border-b border-line">
        {TEAM.map((person) => (
          <li
            key={person.name}
            className="grid gap-2 border-t border-line py-6 md:grid-cols-[minmax(0,17rem)_12rem_1fr] md:items-baseline md:gap-10"
          >
            <h3 className="text-[1.625rem] leading-tight font-extrabold text-ink">
              {person.name}
            </h3>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-navy">
              {person.area}
            </p>
            <p className="text-lg text-muted">{person.scope}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-lg text-ink">{INCUBATOR_LINE}.</p>
    </Section>
  )
}
