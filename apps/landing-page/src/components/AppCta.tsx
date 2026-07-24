/*
 * App-handoff CTA — the public site is onboarding-only (ADR-002 / debate D2.3):
 * booking, payment, and tracking live in the mobile apps. Store links are
 * placeholders until the apps are published (flagged to business).
 */
export function AppCta({
  title = 'Ready to skip laundry day?',
  subtitle = 'Book pickups and track your orders in the Wash & Go app.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <section className="mx-auto mt-16 w-full max-w-5xl px-6">
      <div className="rounded-3xl bg-[#3D5975] px-8 py-12 text-center sm:px-12">
        <h2 className="font-['Unbounded'] text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-['Montserrat'] text-sm text-white/80 sm:text-base">
          {subtitle}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-[#D07A29]/70 px-8 py-3.5 font-['Montserrat'] text-sm font-semibold text-white"
          >
            Get the Customer App
          </button>
          <span className="font-['Montserrat'] text-xs text-white/60">
            Coming soon to Google Play and the App Store
          </span>
        </div>
      </div>
    </section>
  )
}
