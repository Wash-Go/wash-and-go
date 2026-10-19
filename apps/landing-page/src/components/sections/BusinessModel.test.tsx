import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SHOW_UNIT_ECONOMICS } from '../../content/site'
import { BusinessModel } from './BusinessModel'

describe('BusinessModel', () => {
  it('shows the three revenue streams', () => {
    const html = renderToStaticMarkup(<BusinessModel />)
    expect(html).toContain('Revenue streams')
    expect(html).toContain('Transaction commission')
    expect(html).toContain('Platform service fee')
    expect(html).toContain(
      'Business-plan rates. In the alpha, delivery is priced by TomTom driving distance and every fee is admin-editable; the app screenshots show alpha test values.',
    )
  })

  // Table 4 in the founders' doc does not add up (delivery 40 in the row, 35
  // in the totals). It stays off the page until they reconcile it.
  it('does not render the unreconciled unit-economics table', () => {
    expect(SHOW_UNIT_ECONOMICS).toBe(false)
    const html = renderToStaticMarkup(<BusinessModel />)
    expect(html).not.toContain('Unit economics')
    expect(html).not.toContain('198')
    expect(html).not.toContain('Net contribution')
  })
})
