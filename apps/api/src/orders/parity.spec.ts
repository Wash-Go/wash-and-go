import { readFileSync } from 'fs';
import { join } from 'path';
import { OrderStatus } from '@prisma/client';
import {
  LOAD_CATEGORIES as API_LOADS,
  LOAD_CATEGORY_KEYS as API_KEYS,
  MAX_WEIGH_KG as API_MAX_WEIGH_KG,
} from './load';
import { OUTSIDE_COVERAGE_MESSAGE } from './orders.service';

/*
 * Cross-package parity. The API hand-mirrors shared runtime constants because it
 * can only TYPE-import the workspace packages at runtime (they ship as unbuilt TS
 * source). So we can't value-import @wash-and-go/domain here — that breaks the API
 * build. Instead we read the domain source as text and extract the values, making
 * the mirrors self-enforcing:
 *  - domain ORDER_STATUSES must equal the Prisma-generated enum (schema truth)
 *  - API + domain load catalogs must agree on keys + estimate kg
 *  - the customer app's out-of-area matcher must equal the API's message
 * A drift now fails CI instead of shipping silently.
 */
const DOMAIN = join(__dirname, '../../../../packages/domain/src');
const orderStatusSrc = readFileSync(join(DOMAIN, 'order-status.ts'), 'utf8');
const loadSrc = readFileSync(join(DOMAIN, 'load.ts'), 'utf8');
// The customer app's out-of-area matcher (U0 T6) — an app file, not domain,
// because it is the only consumer of the message.
const customerCoverageSrc = readFileSync(
  join(__dirname, '../../../customer-mobile/src/lib/coverage.ts'),
  'utf8',
);

function domainOrderStatuses(): string[] {
  const block = orderStatusSrc.match(/ORDER_STATUSES\s*=\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error('ORDER_STATUSES not found in domain/order-status.ts');
  return [...block[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
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

  // The customer checkout swaps this exact API message for plain words. A
  // reworded API message would silently fall back to showing the raw text.
  it('the customer app matches the exact out-of-coverage message the API sends', () => {
    const m = customerCoverageSrc.match(/API_OUTSIDE_COVERAGE\s*=\s*'([^']+)'/);
    if (!m) throw new Error('API_OUTSIDE_COVERAGE not found in customer-mobile/src/lib/coverage.ts');
    expect(m[1]).toBe(OUTSIDE_COVERAGE_MESSAGE);
  });
});
