import { DECK_MAILTO, STAGE_LINE } from '../../content/site'
import { COVERAGE_MAP } from '../../content/screens'
import { ButtonLink, Container, DesktopShot } from '../ui'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-white pt-12 pb-16 md:pt-20 md:pb-24"
    >
      <Container>
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-sky-tint px-3 py-1.5 text-sm font-bold text-brand-navy">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-brand-sky"
          />
          {STAGE_LINE}
        </p>
        <h1
          id="hero-title"
          className="mt-6 max-w-[17ch] font-display text-[clamp(2.25rem,5.4vw,4.25rem)] leading-[0.98] font-extrabold tracking-[-0.01em] text-brand-navy [font-stretch:125%]"
        >
          Laundry pickup, delivery and settlement for Zamboanga City.
        </h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
          <div>
            <p className="max-w-xl text-lg leading-relaxed text-ink md:text-xl">
              Wash &amp; Go is a scheduling-first laundry marketplace. It
              aggregates trusted local laundry shops onto one platform and
              coordinates collection, washing and the return to the customer’s
              door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={DECK_MAILTO}>Request the deck</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                How it works
              </ButtonLink>
            </div>
          </div>
          <DesktopShot shot={COVERAGE_MAP} eager />
        </div>
      </Container>
    </section>
  )
}
