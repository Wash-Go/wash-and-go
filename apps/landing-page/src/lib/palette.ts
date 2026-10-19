/**
 * Colour helpers for the landing palette: WCAG 2.x contrast ratios and a
 * reader for the `--color-*` tokens declared in a Tailwind `@theme` block.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function channels(hex: string): [number, number, number] {
  const match = HEX.exec(hex.trim())
  if (!match) throw new Error(`Not a hex colour: ${hex}`)
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((d) => d + d)
          .join('')
      : match[1]
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
}

/** WCAG 2.x relative luminance of an sRGB hex colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Reads `--color-<name>: #hex;` declarations from the first `@theme { ... }`
 * block of a stylesheet. Names are returned without the `--color-` prefix and
 * values lower-cased.
 */
export function readThemeColors(css: string): Record<string, string> {
  const block = /@theme\s*\{([^}]*)\}/.exec(css)
  if (!block) return {}
  const colors: Record<string, string> = {}
  for (const [, name, value] of block[1].matchAll(
    /--color-([\w-]+)\s*:\s*(#[0-9a-f]{3,6})\s*;/gi,
  )) {
    colors[name] = value.toLowerCase()
  }
  return colors
}
