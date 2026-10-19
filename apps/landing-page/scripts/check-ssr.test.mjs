import { describe, expect, it } from 'vitest'
import { HERO_H1, checkSsrHtml } from './check-ssr.mjs'

const good = `<!DOCTYPE html><html><body><main id="main"><h1 id="hero-title" class="x">${HERO_H1}</h1></main>
<script>$_TSR.router=($R=>$R[0]={matches:$R[10]=[$R[11]={i:"__root__ ",s:"success",ssr:!0}]})($R["tsr"])</script></body></html>`

describe('checkSsrHtml', () => {
  it('passes a prerendered page with the hero h1 and no fallback markers', () => {
    expect(checkSsrHtml(good)).toEqual([])
  })

  it('fails when the h1 is missing or has other text', () => {
    expect(checkSsrHtml(good.replace(HERO_H1, 'Loading'))).toContainEqual(
      expect.stringContaining('hero <h1>'),
    )
    expect(checkSsrHtml('<html><body></body></html>')).toContainEqual(
      expect.stringContaining('hero <h1>'),
    )
  })

  it('fails when there is more than one h1', () => {
    expect(
      checkSsrHtml(good.replace('</main>', '<h1>Two</h1></main>')),
    ).toContainEqual(expect.stringContaining('exactly one <h1>'))
  })

  it('fails on React client-render fallbacks and error markers', () => {
    for (const marker of [
      '<!--$!-->',
      '<template data-msg="Switched to client rendering"></template>',
      '<script>$RX("B:0")</script>',
      '<script>$RC("B:0","S:0")</script>',
      'Minified React error #418',
      '<template data-dgst="123"></template>',
    ]) {
      expect(
        checkSsrHtml(good.replace('</main>', `${marker}</main>`)),
      ).not.toEqual([])
    }
  })

  it('fails when TanStack marks a match as client-only or errored', () => {
    expect(checkSsrHtml(good.replace('ssr:!0', 'ssr:!1'))).not.toEqual([])
    expect(checkSsrHtml(good.replace('s:"success"', 's:"error"'))).not.toEqual(
      [],
    )
  })

  it('fails when the <main> landmark is missing', () => {
    expect(checkSsrHtml(good.replace(/<\/?main[^>]*>/g, ''))).toContainEqual(
      expect.stringContaining('<main>'),
    )
  })
})
