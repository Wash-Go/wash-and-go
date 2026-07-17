import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatsBanner } from './StatsBanner'

describe('StatsBanner', () => {
  it('renders all service statistics', () => {
    const html = renderToStaticMarkup(<StatsBanner />)

    expect(html).toContain('100,000+')
    expect(html).toContain('500+')
    expect(html).toContain('1000+')
    expect(html).toContain('Pounds of laundry cleaned')
    expect(html).toContain('Orders Serviced')
    expect(html).toContain('Satisfied Clients')
  })
})
