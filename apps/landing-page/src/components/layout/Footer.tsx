import lockup from '../../assets/brand/logo-lockup-320.webp'
import { CONTACT_EMAIL } from '../../content/site'
import { Container } from '../ui'

export function Footer() {
  return (
    <footer className="border-t border-line bg-white py-12">
      <Container className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <img
            src={lockup}
            width={320}
            height={192}
            alt="Wash & Go"
            loading="lazy"
            decoding="async"
            className="h-16 w-auto"
          />
          <p className="mt-4 text-sm text-muted">
            Incubated at AZUL Hub, Ateneo de Zamboanga University
          </p>
        </div>
        <div className="space-y-1 text-sm text-muted md:text-right">
          <p className="font-mono text-ink">{CONTACT_EMAIL}</p>
          <p>© 2026 Wash &amp; Go · Zamboanga City</p>
          {/* Terms and Privacy links go here once the drafts in
              personal-docs/legal are approved by the cofounders. */}
        </div>
      </Container>
    </footer>
  )
}
