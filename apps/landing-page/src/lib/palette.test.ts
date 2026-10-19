/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { contrastRatio, readThemeColors } from './palette'

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../styles/globals.css'),
  'utf8',
)

const REQUIRED = [
  'brand-sky',
  'brand-navy',
  'brand-navy-deep',
  'brand-sky-tint',
  'ink',
  'muted',
  'line',
  'ground',
  'accent',
] as const

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('is symmetric and accepts shorthand hex', () => {
    expect(contrastRatio('#fff', '#0b3773')).toBeCloseTo(
      contrastRatio('#0b3773', '#ffffff'),
      10,
    )
  })

  it('rejects malformed colours', () => {
    expect(() => contrastRatio('navy', '#ffffff')).toThrow()
  })
})

describe('readThemeColors', () => {
  it('reads --color-* tokens from the @theme block only', () => {
    const css = `:root { --color-x: #111111; }\n@theme {\n  --font-sans: 'A';\n  --color-ink: #14202B;\n  --color-brand-sky: #4ebbe6;\n}`
    expect(readThemeColors(css)).toEqual({
      ink: '#14202b',
      'brand-sky': '#4ebbe6',
    })
  })
})

describe('landing palette tokens (globals.css)', () => {
  const colors = readThemeColors(CSS)
  const c = (name: (typeof REQUIRED)[number]) => colors[name]

  it('defines every required brand token', () => {
    for (const name of REQUIRED) expect(colors, name).toHaveProperty(name)
  })

  it('keeps the measured logo colours, carbon ink and terracotta accent', () => {
    expect(c('brand-navy')).toBe('#0b3773')
    expect(c('brand-sky')).toBe('#4ebbe6')
    expect(c('ink')).toBe('#14202b')
    expect(c('accent')).toBe('#a64b16')
  })

  it.each([
    ['navy on white', 'brand-navy', '#ffffff', 4.5],
    ['white on navy-deep', 'brand-navy-deep', '#ffffff', 4.5],
    ['ink on white', 'ink', '#ffffff', 4.5],
    ['muted on white', 'muted', '#ffffff', 4.5],
    ['ink on sky-tint', 'ink', 'brand-sky-tint', 4.5],
    ['muted on sky-tint', 'muted', 'brand-sky-tint', 4.5],
    ['muted on ground', 'muted', 'ground', 4.5],
    ['white on accent', 'accent', '#ffffff', 4.5],
    // Sky on navy clears 4.5 too, but DESIGN.md only promises it for large text.
    ['sky on navy (large text)', 'brand-sky', 'brand-navy', 3],
  ] as const)('%s meets %s', (_label, fg, bg, min) => {
    const resolve = (v: string) => (v.startsWith('#') ? v : colors[v])
    expect(contrastRatio(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(min)
  })

  it('keeps sky-tint a near-white section ground that navy reads on at 10:1', () => {
    expect(
      contrastRatio(c('brand-navy'), c('brand-sky-tint')),
    ).toBeGreaterThanOrEqual(10)
    expect(contrastRatio(c('brand-sky-tint'), '#ffffff')).toBeLessThanOrEqual(
      1.1,
    )
  })
})
