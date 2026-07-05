import Image from "next/image";

export function Schedule() {
  return (
    <section id="services" className="bg-brand-off-white py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        {/* Phone mockup (Figma export) */}
        <div className="relative order-2 md:order-1">
          <div className="mx-auto w-64 md:w-72">
            <Image
              src="/figma/phone-schedule.png"
              alt="Wash & Go mobile app — Schedule Your Pickup screen"
              width={610}
              height={824}
              className="h-auto w-full drop-shadow-2xl"
            />
          </div>
          <div className="pointer-events-none absolute -right-4 top-1/2 hidden h-24 w-24 rounded-full bg-brand-peach/50 blur-2xl md:block" />
        </div>

        {/* Copy */}
        <div className="order-1 md:order-2">
          <h2 className="font-heading text-3xl font-extrabold text-brand-navy md:text-4xl">
            Schedule Your Pick up
          </h2>
          <p className="mt-3 max-w-md text-brand-slate/80">
            Pick a time, we pick it up. Fresh, folded, and delivered without the hassle.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#book" className="btn-steel">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              Express pickup
            </a>
            <a href="#schedule" className="btn-secondary">
              <Image src="/figma/icon-calendar.svg" alt="" width={16} height={18} className="h-4 w-4" />
              Schedule later
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
