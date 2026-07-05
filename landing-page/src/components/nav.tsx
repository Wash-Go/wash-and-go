import { Logo } from "./logo";

const NAV_ITEMS = [
  { label: "Home", href: "#home", active: true },
  { label: "Services", href: "#services" },
  { label: "Book Order", href: "#book" },
  { label: "My Orders", href: "#orders" },
  { label: "Pricing", href: "#pricing" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-gray/30 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={item.active ? "nav-pill-active" : "nav-pill"}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-9 w-9 place-items-center rounded-full text-brand-slate/70 transition hover:bg-brand-off-white hover:text-brand-navy"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path
                d="M12 2a6 6 0 00-6 6v3.5L4.5 15h15L18 11.5V8a6 6 0 00-6-6zM9 18a3 3 0 006 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <a href="#login" className="btn-steel px-5 py-2 text-sm">
            Login
          </a>
        </div>
      </div>
    </header>
  );
}
