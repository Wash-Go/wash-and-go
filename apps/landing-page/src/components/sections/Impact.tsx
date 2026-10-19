import { IMPACT } from '../../content/site'
import { Section, SectionHeading } from '../ui'

export function Impact() {
  return (
    <Section id="impact">
      <SectionHeading
        id="impact"
        eyebrow="Impact"
        title="What changes for each side of the order."
      />
      <div className="mt-12 border-b border-line">
        {IMPACT.map((actor) => (
          <div
            key={actor.name}
            className="grid gap-4 border-t border-line py-8 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-10"
          >
            <h3 className="text-xl font-bold text-brand-navy">{actor.name}</h3>
            <ul className="max-w-2xl space-y-3">
              {actor.points.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-lg leading-relaxed text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="mt-3.5 h-0.5 w-4 shrink-0 bg-brand-sky"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
