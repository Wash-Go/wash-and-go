import { readFileSync } from 'fs';
import { join } from 'path';
import { OrderStatus } from '@prisma/client';
import {
  LOAD_CATEGORIES as API_LOADS,
  LOAD_CATEGORY_KEYS as API_KEYS,
  MAX_WEIGH_KG as API_MAX_WEIGH_KG,
} from './load';
import { OUTSIDE_COVERAGE_MESSAGE } from './orders.service';
import { ACTIVE_ORDER_STATUSES, isTerminal } from './order-status';

/*
 * Cross-package parity. The API hand-mirrors shared runtime constants because it
 * can only TYPE-import the workspace packages at runtime (they ship as unbuilt TS
 * source). So we can't value-import @wash-and-go/domain here — that breaks the API
 * build. Instead we read the domain source as text and extract the values, making
 * the mirrors self-enforcing:
 *  - domain ORDER_STATUSES must equal the Prisma-generated enum (schema truth)
 *  - API + domain load catalogs must agree on keys + estimate kg
 *  - API + domain must agree on the out-of-coverage message (the customer app
 *    matches on the domain constant)
 * A drift now fails CI instead of shipping silently.
 */
const DOMAIN = join(__dirname, '../../../../packages/domain/src');
const orderStatusSrc = readFileSync(join(DOMAIN, 'order-status.ts'), 'utf8');
const loadSrc = readFileSync(join(DOMAIN, 'load.ts'), 'utf8');
const coverageSrc = readFileSync(join(DOMAIN, 'coverage.ts'), 'utf8');

function domainOrderStatuses(): string[] {
  const block = orderStatusSrc.match(/ORDER_STATUSES\s*=\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error('ORDER_STATUSES not found in domain/order-status.ts');
  return [...block[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
}

// STATUS_META entries: `NAME: { ... terminal: true|false ... }` (single- or
// multi-line), read as text.
function domainTerminal(): Record<string, boolean> {
  const block = orderStatusSrc.match(/STATUS_META[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('STATUS_META not found in domain/order-status.ts');
  const out: Record<string, boolean> = {};
  for (const m of block[1].matchAll(/([A-Z_]+):\s*\{[^}]*?terminal:\s*(true|false)/g)) {
    out[m[1]] = m[2] === 'true';
  }
  return out;
}

function domainLoads(): [string, number][] {
  return [...loadSrc.matchAll(/key:\s*'([SML])'[\s\S]*?estimateKg:\s*(\d+)/g)].map(
    (m) => [m[1], Number(m[2])],
  );
}

describe('cross-package parity', () => {
  it('domain ORDER_STATUSES matches the Prisma schema enum exactly', () => {
    expect(domainOrderStatuses().sort()).toEqual(Object.values(OrderStatus).sort());
  });

  // GET /orders?active=true lists every non-terminal status. The API derives
  // terminal from its transition machine (no outgoing edges); the portal tabs
  // read domain STATUS_META.terminal. They must name the same set.
  it('API and domain agree on which order statuses are terminal', () => {
    const domain = domainTerminal();
    expect(Object.keys(domain).sort()).toEqual(Object.values(OrderStatus).sort());
    for (const s of Object.values(OrderStatus)) expect([s, isTerminal(s)]).toEqual([s, domain[s]]);
    expect(Object.entries(domain).filter(([, t]) => t).map(([s]) => s).sort()).toEqual([
      'CANCELLED',
      'DELIVERED',
    ]);
    expect([...ACTIVE_ORDER_STATUSES].sort()).toEqual(
      Object.entries(domain).filter(([, t]) => !t).map(([s]) => s).sort(),
    );
  });

  it('API and domain load categories agree on keys', () => {
    expect([...API_KEYS]).toEqual(domainLoads().map(([k]) => k));
  });

  it('API and domain load categories agree on estimate kg per key', () => {
    const apiKg = API_LOADS.map((c) => [c.key, c.estimateKg] as [string, number]);
    expect(apiKg).toEqual(domainLoads());
  });

  // The laundry portal gates the weigh input on the domain value; the API
  // enforces its mirror. A drift would let the UI offer a weight the API
  // refuses (or silently accept one the UI meant to block).
  it('API and domain agree on the maximum weigh-in kg', () => {
    const m = loadSrc.match(/MAX_WEIGH_KG\s*=\s*(\d+(?:\.\d+)?)/);
    if (!m) throw new Error('MAX_WEIGH_KG not found in domain/load.ts');
    expect(API_MAX_WEIGH_KG).toBe(Number(m[1]));
    expect(API_MAX_WEIGH_KG).toBe(50);
  });

  // The customer checkout swaps this exact API message for plain words, matching
  // on the domain constant. A reworded API message would silently fall back to
  // showing the raw text.
  it('API and domain agree on the out-of-coverage message', () => {
    const m = coverageSrc.match(/OUTSIDE_COVERAGE_MESSAGE\s*=\s*'([^']+)'/);
    if (!m) throw new Error('OUTSIDE_COVERAGE_MESSAGE not found in domain/coverage.ts');
    expect(OUTSIDE_COVERAGE_MESSAGE).toBe(m[1]);
    expect(OUTSIDE_COVERAGE_MESSAGE).toBe('Pickup location is outside coverage');
  });
});
