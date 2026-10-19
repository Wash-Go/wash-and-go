import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'inverse'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-brand-navy text-white hover:bg-brand-navy-deep active:bg-brand-navy-deep',
  secondary:
    'border-2 border-brand-navy bg-white text-brand-navy hover:bg-brand-sky-tint',
  inverse:
    'bg-white text-brand-navy hover:bg-brand-sky-tint focus-visible:outline-white',
}

/** A link styled as a DESIGN.md button (48px min height, md radius). */
export function ButtonLink({
  href,
  variant = 'primary',
  children,
  className = '',
  onClick,
}: {
  href: string
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center rounded-[10px] px-6 text-base font-bold transition-colors duration-150 ease-out ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
