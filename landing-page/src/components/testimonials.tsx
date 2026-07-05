import Image from "next/image";

const TESTIMONIALS = [
  {
    name: "Jon Orillineda",
    role: "Customer",
    initials: "JO",
    quote:
      "Wash & Go is really convenient. I scheduled a pickup and it arrived right on time. My clothes were perfectly folded. It saved me a lot of trouble going to a laundry shop myself.",
  },
  {
    name: "Jon Orillineda",
    role: "Customer",
    initials: "JO",
    quote:
      "Booking a laundry pickup was very easy and straightforward. I liked that I could choose the service and track the progress of my order. The delivery was fast, and my clothes came back smelling fresh and perfectly cleaned.",
  },
  {
    name: "Jon Orillineda",
    role: "Customer",
    initials: "JO",
    quote:
      "This platform makes doing laundry from scheduling a pickup to receiving it back smooth and reliable. The laundry shop was reliable. I'll definitely use the service again.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-brand-off-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h2 className="font-heading text-3xl font-extrabold text-brand-navy md:text-4xl">
              What Our Customers Says
              <br />
              About Us
            </h2>
            <p className="mt-3 max-w-sm text-brand-slate/80">
              We&apos;ve compiled feedback from our customers about laundries that may interest you.
              Let us assist you in cleaning your clothes conveniently.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <article
                key={i}
                className="rounded-2xl bg-brand-sky-light/60 p-5 shadow-sm ring-1 ring-white/50"
              >
                <p className="text-sm leading-relaxed text-brand-slate">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-navy text-[10px] font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-brand-navy">{t.name}</span>
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-500" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 15l-5.1 2.7 1-5.7L3.8 8l5.7-.8L12 2z" />
                      </svg>
                    </div>
                    <div className="text-[10px] text-brand-slate/60">{t.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Happy customers badge */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <div className="flex items-center gap-3 rounded-pill bg-white px-4 py-2 shadow-sm ring-1 ring-brand-gray/40">
            <div className="flex -space-x-2">
              {["#CA6E27", "#6595BD", "#2D3E4D"].map((c, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full border-2 border-white"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="font-heading text-lg font-extrabold text-brand-navy">69 +</div>
            <div className="text-[10px] text-brand-slate/60">
              Happy Customers
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-orange" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
