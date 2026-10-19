import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import * as screens from './screens'
import type { Shot } from '../components/ui'

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const ALL: Array<[string, Shot]> = Object.entries(screens).flatMap(
  ([name, value]) =>
    Array.isArray(value)
      ? (value as Array<Shot>).map((shot, i): [string, Shot] => [
          `${name}[${i}]`,
          shot,
        ])
      : [[name, value as Shot]],
)

describe('screenshot catalogue', () => {
  it('covers all thirteen screens, admin gallery included', () => {
    expect(ALL).toHaveLength(13)
    expect(screens.ADMIN_SHOTS).toHaveLength(5)
  })

  it.each(ALL)('%s resolves to a real WebP file', (_, shot) => {
    expect(typeof shot.src).toBe('string')
    expect(shot.src).toMatch(/\.webp$/)
    // Under vitest an asset import is its source path (/src/assets/...).
    expect(existsSync(join(SRC_DIR, shot.src.replace(/^\/src\//, '')))).toBe(
      true,
    )
  })

  it.each(ALL)('%s has dimensions, alt text and a caption', (_, shot) => {
    expect(shot.width).toBeGreaterThan(0)
    expect(shot.height).toBeGreaterThan(0)
    expect(shot.alt.length).toBeGreaterThan(20)
    expect(shot.caption.length).toBeGreaterThan(10)
  })
})
