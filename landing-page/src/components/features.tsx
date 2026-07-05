import Image from "next/image";

export function Features() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl space-y-24 px-6">
        {/* Fast & Reliable Delivery */}
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl font-extrabold text-brand-navy md:text-4xl">
              Fast &amp; Reliable Delivery
            </h2>
            <p className="mt-3 max-w-md text-brand-slate/80">
              Get your laundry back fresh and folded on time in every time. Fast, reliable,
              and hassle-free.
            </p>
            <a href="#book" className="btn-primary mt-6">
              Book Laundry Now
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <Image
              src="/figma/fast-delivery.png"
              alt="Stack of folded clothes with Fast & Reliable Delivery seal"
              width={493}
              height={459}
              className="h-auto w-full"
            />
          </div>
        </div>

        {/* Premium Laundry Care (reverse) */}
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="relative order-2 mx-auto w-full max-w-sm md:order-1">
            <Image
              src="/figma/premium-care.png"
              alt="Premium laundry care — washing and folding"
              width={670}
              height={686}
              className="h-auto w-full"
            />
          </div>

          <div className="order-1 md:order-2">
            <h2 className="font-heading text-3xl font-extrabold text-brand-navy md:text-4xl">
              Premium Laundry Care
            </h2>
            <p className="mt-3 max-w-md text-brand-slate/80">
              We treat every fabric with care, using quality detergents and professional
              techniques for the best results.
            </p>
            <a href="#services" className="btn-secondary mt-6">
              Explore Services
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
