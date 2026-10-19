/**
 * Small pure helpers for the links the investor page builds: the deck
 * request mailto and absolute URLs for canonical / Open Graph tags.
 */

/** A `mailto:` href with an optional, properly encoded subject line. */
export function mailtoHref(email: string, subject?: string): string {
  const address = email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error(`Not an email address: ${email}`)
  }
  return subject
    ? `mailto:${address}?subject=${encodeURIComponent(subject)}`
    : `mailto:${address}`
}

/**
 * Joins a site origin and a path. With no origin configured it returns the
 * root-relative path, so local builds still produce usable tags.
 */
export function absoluteUrl(path: string, origin?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const base = (origin ?? '').trim().replace(/\/+$/, '')
  return `${base}${cleanPath}`
}
