/** Shared lift for anything that floats above the page (DESIGN.md elevation). */
const LIFT = 'shadow-[0_8px_24px_-12px_rgba(20,32,43,0.35)]'

export type Shot = {
  src: string
  width: number
  height: number
  alt: string
  caption: string
}

/** A phone screenshot in a plain CSS frame; lazy unless it is above the fold. */
export function PhoneShot({
  shot,
  eager = false,
  className = '',
}: {
  shot: Shot
  eager?: boolean
  className?: string
}) {
  return (
    <figure className={`w-[13.5rem] shrink-0 sm:w-60 ${className}`}>
      <div className={`rounded-[2rem] bg-ink p-1.5 ${LIFT}`}>
        <img
          src={shot.src}
          width={shot.width}
          height={shot.height}
          alt={shot.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-auto w-full rounded-[1.65rem] bg-white"
        />
      </div>
      <figcaption className="mt-3 text-sm leading-snug text-muted">
        {shot.caption}
      </figcaption>
    </figure>
  )
}

/** A desktop screenshot: plain bordered image with a caption. */
export function DesktopShot({
  shot,
  eager = false,
  className = '',
}: {
  shot: Shot
  eager?: boolean
  className?: string
}) {
  return (
    <figure className={className}>
      <img
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        className="block h-auto w-full rounded-2xl border border-line bg-white"
      />
      <figcaption className="mt-3 text-sm leading-snug text-muted">
        {shot.caption}
      </figcaption>
    </figure>
  )
}
