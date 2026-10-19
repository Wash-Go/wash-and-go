import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Footer } from './Footer'

describe('Footer', () => {
  it('names the incubator in full, with ADZU-TBI', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain(
      'Incubated at AZUL Hub, Ateneo de Zamboanga University (ADZU-TBI)',
    )
    expect(html).toContain('© 2026 Wash &amp; Go · Zamboanga City')
  })
})
