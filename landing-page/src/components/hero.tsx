import Image from "next/image";

export function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-white via-white to-brand-off-white"
    >
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 md:pt-24 md:pb-16">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-navy md:text-6xl lg:text-7xl">
            Seamless Laundry
            <br />
            Anytime, <span className="text-brand-orange">Anywhere.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-slate/80 md:text-lg">
            From Your Door to Fresh &amp; Folded.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl shadow-card">
          <div className="relative w-full" style={{ aspectRatio: "1345 / 467" }}>
            <Image
              src="/figma/hero-basket.png"
              alt="Freshly folded laundry in a basket"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 960px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40" />
          </div>

          {/* Overlay CTAs */}
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <a href="#book" className="btn-primary">
              Book Laundry Now
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a href="#pricing" className="btn-secondary">
              See Pricing
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

          {/* Quality assured badge */}
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-pill bg-white/95 px-3 py-1.5 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="currentColor" aria-hidden>
              <path d="M12 2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 15l-5.1 2.7 1-5.7L3.8 8l5.7-.8L12 2z" />
            </svg>
            <span className="text-xs font-semibold text-brand-navy">Quality Assured</span>
          </div>
        </div>
      </div>
    </section>
  );
}
