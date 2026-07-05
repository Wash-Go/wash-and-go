export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const textColor = variant === "dark" ? "text-brand-navy" : "text-white";
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-steel-blue text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M12 2c1.5 3 5 4 5 7.5S14.76 15 12 15s-5-2-5-5.5S10.5 5 12 2z"
            fill="currentColor"
          />
          <path
            d="M6 17h12M8 20h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={`font-heading text-lg font-extrabold tracking-tight ${textColor}`}>
        WASH &amp; GO
      </span>
    </div>
  );
}
