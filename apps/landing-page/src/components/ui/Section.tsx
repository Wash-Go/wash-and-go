import type { ReactNode } from 'react'

type Band = 'white' | 'tint' | 'navy'

const BAND_CLASS: Record<Band, string> = {
  white: 'bg-white text-ink',
  tint: 'bg-brand-sky-tint text-ink',
  navy: 'bg-brand-navy text-white',
}

/** Page width per DESIGN.md (1180px) with a 16px phone gutter. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * One full-width band of the page. `id` doubles as the navbar anchor and the
 * heading id the section is labelled by.
 */
export function Section({
  id,
  band = 'white',
  children,
}: {
  id: string
  band?: Band
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-20 py-16 md:py-24 ${BAND_CLASS[band]}`}
    >
      <Container>{children}</Container>
    </section>
  )
}

/** Eyebrow label + display h2, left-aligned, with an optional lead paragraph. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  inverse = false,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  inverse?: boolean
}) {
  return (
    <header className="max-w-3xl">
      <p
        className={`text-xs font-bold uppercase tracking-[0.08em] ${inverse ? 'text-brand-sky' : 'text-brand-navy'}`}
      >
        {eyebrow}
      </p>
      <h2
        id={`${id}-title`}
        className="mt-3 font-display text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.05] font-extrabold tracking-[-0.01em] text-balance [font-stretch:125%]"
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`mt-5 text-lg leading-relaxed ${inverse ? 'text-white' : 'text-muted'}`}
        >
          {lead}
        </p>
      ) : null}
    </header>
  )
}
