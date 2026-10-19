import { describe, expect, it } from 'vitest'

import { absoluteUrl, mailtoHref } from './links'

describe('mailtoHref', () => {
  it('builds a bare mailto link', () => {
    expect(mailtoHref('a@b.co')).toBe('mailto:a@b.co')
  })

  it('encodes the subject line', () => {
    expect(mailtoHref('a@b.co', 'Wash & Go deck?')).toBe(
      'mailto:a@b.co?subject=Wash%20%26%20Go%20deck%3F',
    )
  })

  it('rejects something that is not an address', () => {
    expect(() => mailtoHref('not-an-email')).toThrow()
  })
})

describe('absoluteUrl', () => {
  it('joins an origin and a path without doubling slashes', () => {
    expect(absoluteUrl('/og.png', 'https://example.com/')).toBe(
      'https://example.com/og.png',
    )
    expect(absoluteUrl('og.png', 'https://example.com')).toBe(
      'https://example.com/og.png',
    )
  })

  it('falls back to a root-relative path with no origin', () => {
    expect(absoluteUrl('/', undefined)).toBe('/')
    expect(absoluteUrl('/og.png', '  ')).toBe('/og.png')
  })
})
