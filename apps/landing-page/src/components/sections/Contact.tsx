import { CONTACT_EMAIL, DECK_MAILTO, INCUBATOR_LINE } from '../../content/site'
import { ButtonLink, Section, SectionHeading } from '../ui'

export function Contact() {
  return (
    <Section id="contact" band="navy">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <SectionHeading
          id="contact"
          eyebrow="Investors"
          title="Request the deck."
          lead="For the pitch deck or a walkthrough of the alpha, email Gabrielle Tatel, CEO."
          inverse
        />
        <div>
          <ButtonLink href={DECK_MAILTO} variant="inverse">
            Request the deck
          </ButtonLink>
          <p className="mt-4 font-mono text-base break-all text-white">
            {CONTACT_EMAIL}
          </p>
          <p className="mt-6 text-sm text-brand-sky-tint">{INCUBATOR_LINE}.</p>
        </div>
      </div>
    </Section>
  )
}
