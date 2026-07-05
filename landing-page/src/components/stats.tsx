import Image from "next/image";

const STATS = [
  {
    value: "100,000+",
    label: "Pounds of Laundry Cleaned",
    icon: "/figma/icon-washer.svg",
  },
  {
    value: "500+",
    label: "Orders Serviced Daily",
    icon: "/figma/icon-basket.svg",
  },
  {
    value: "1000+",
    label: "Happy Customers",
    icon: "/figma/icon-users-group.svg",
  },
];

export function Stats() {
  return (
    <section aria-label="Trust indicators" className="border-b border-brand-gray/30 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex items-center justify-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-sky-light/50">
              <Image src={stat.icon} alt="" width={32} height={32} className="h-8 w-8" />
            </div>
            <div>
              <div className="font-heading text-2xl font-extrabold text-brand-navy">
                {stat.value}
              </div>
              <div className="text-xs text-brand-slate/70">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
