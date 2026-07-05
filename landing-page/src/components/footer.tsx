import { Logo } from "./logo";

const QUICK_LINKS = ["Home", "Services", "Book Order", "My Orders", "Pricing"];
const ABOUT_LINKS = ["About Us", "Contact Us", "Our Partners"];
const HELP_LINKS = ["Help Center", "Terms of Service", "Privacy Policy"];

export function Footer() {
  return (
    <footer className="border-t border-brand-gray/40 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
        <FooterCol title="Quick Links" links={QUICK_LINKS} />
        <FooterCol title="About Wash&Go" links={ABOUT_LINKS} />
        <FooterCol title="Need Help?" links={HELP_LINKS} />

        <div>
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <form className="mt-4 flex max-w-sm items-center gap-2">
            <input
              type="email"
              placeholder="Your Email"
              className="w-full rounded-pill border border-brand-gray/40 bg-brand-off-white px-4 py-2 text-sm text-brand-navy outline-none placeholder:text-brand-slate/50 focus:border-brand-orange"
            />
            <button type="submit" className="btn-primary py-2 text-sm">
              Sign Up
            </button>
          </form>
          <p className="mt-3 max-w-sm text-xs text-brand-slate/60">
            Get updates on new services, promos, and laundry tips delivered to your inbox.
          </p>
        </div>
      </div>

      <div className="border-t border-brand-gray/30 bg-brand-off-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 text-xs text-brand-slate/60 sm:flex-row">
          <p>© 2026 Wash &amp; Go. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <SocialIcon label="Facebook" path="M13 3h4v4h-3c-1 0-1 .5-1 1v3h4l-1 4h-3v7h-4v-7H6v-4h3V7c0-2.2 1.8-4 4-4z" bg="#1877F2" />
            <SocialIcon label="YouTube" path="M2 8c0-2 1-3 3-3h14c2 0 3 1 3 3v8c0 2-1 3-3 3H5c-2 0-3-1-3-3V8zm8 1v6l5-3-5-3z" bg="#FF0000" />
            <SocialIcon label="Instagram" path="M7 3h10c2 0 4 2 4 4v10c0 2-2 4-4 4H7c-2 0-4-2-4-4V7c0-2 2-4 4-4zm5 5a4 4 0 100 8 4 4 0 000-8zm5-1a1 1 0 100 2 1 1 0 000-2z" bg="#E4405F" />
            <SocialIcon label="TikTok" path="M13 3v10a3 3 0 11-3-3v3a6 6 0 106-6V7c1.5 1 3 1.5 5 1.5v-3c-2 0-4-1-5-2.5h-3z" bg="#000000" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-bold text-brand-navy">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-sm text-brand-slate/70 hover:text-brand-orange">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ label, path, bg }: { label: string; path: string; bg: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full text-white transition hover:scale-110"
      style={{ backgroundColor: bg }}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d={path} />
      </svg>
    </a>
  );
}
