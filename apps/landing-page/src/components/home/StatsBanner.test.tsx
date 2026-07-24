import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatsBanner } from './StatsBanner'

describe('StatsBanner', () => {
  it('renders the honest value props', () => {
    const html = renderToStaticMarkup(<StatsBanner />)

    expect(html).toContain('Same-day')
    expect(html).toContain('Express pickup &amp; delivery')
    expect(html).toContain('Any size')
    expect(html).toContain('Scheduled &amp; business pickups')
    expect(html).toContain('Upfront')
  })
})
