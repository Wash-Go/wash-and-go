import Image from "next/image";

export function CtaBanner() {
  return (
    <section className="bg-brand-off-white pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl shadow-card">
          <Image
            src="/figma/cta-banner-full.png"
            alt="Just take 30 seconds and schedule your laundry pickup"
            width={1265}
            height={435}
            className="h-auto w-full"
            priority
          />
          {/* Clickable overlay covering the baked-in Book Now button area */}
          <a
            href="#book"
            aria-label="Book Now"
            className="absolute left-1/2 top-[62%] h-14 w-40 -translate-x-1/2 -translate-y-1/2 rounded-pill"
          />
        </div>
      </div>
    </section>
  );
}
