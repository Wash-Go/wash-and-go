import { ButtonLink, Container } from '../ui'

/** The styled 404, used by the root not-found handler and /404.html. */
export function NotFound() {
  return (
    <main id="main" className="bg-white py-24 md:py-32">
      <Container>
        <p className="font-mono text-sm font-bold text-brand-navy">404</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1] font-extrabold text-brand-navy [font-stretch:125%]">
          This page is not here.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          The old service, pricing and tracking pages have moved into the single
          overview page.
        </p>
        <div className="mt-8">
          <ButtonLink href="/">Go to the overview</ButtonLink>
        </div>
      </Container>
    </main>
  )
}
