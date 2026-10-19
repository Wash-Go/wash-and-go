import { describe, expect, it } from 'vitest'

import {
  DECK_MAILTO,
  MARKET_SIZING,
  NAV_SECTIONS,
  PROBLEM_STATS,
  UNIT_ECONOMICS,
} from './site'

const amount = (label: string) => {
  const row = UNIT_ECONOMICS.find((r) => r.cells[0] === label)
  if (!row) throw new Error(`missing row ${label}`)
  return Number(row.cells[1].replace(/[()]/g, ''))
}

describe('investor page content', () => {
  it('cites a source for every problem statistic', () => {
    for (const stat of PROBLEM_STATS) expect(stat.source).toMatch(/\(\w/)
  })

  it('keeps the doc Table 4 amounts internally consistent', () => {
    const wash = amount('Wash value (6 kg × ₱25/kg)')
    expect(amount('– Remitted to partner shop (88%)')).toBe(wash * 0.88)
    expect(amount('– Commission retained (12%)')).toBe(wash * 0.12)
    // Known inconsistency in the founders' doc, copied verbatim on purpose:
    // the delivery row says ₱40, but the bill (198) and gross (66 = 18 + 35
    // + 13) both use ₱35. Founders to confirm; when they fix the doc and this
    // table, this assertion fails and should become a plain sum check.
    const impliedDelivery =
      amount("Customer's total bill") - wash - amount('Platform service fee')
    expect(impliedDelivery).toBe(35)
    expect(amount('Delivery fee (scheduled, Tier 1)')).toBe(40)
    expect(amount('Platform gross revenue per order')).toBe(
      amount('– Commission retained (12%)') +
        impliedDelivery +
        amount('Platform service fee'),
    )
    expect(
      amount('Platform gross revenue per order') -
        amount('Less: blended payment processing cost'),
    ).toBe(amount('Net contribution per order'))
  })

  it('gives every market row a basis', () => {
    for (const row of MARKET_SIZING) {
      expect(row.cells).toHaveLength(3)
      expect(row.cells[2].length).toBeGreaterThan(0)
    }
  })

  it('links the nav to unique section ids and mails the deck request', () => {
    const ids = NAV_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DECK_MAILTO).toMatch(/^mailto:[^?]+@[^?]+\?subject=/)
  })
})
