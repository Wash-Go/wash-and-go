import { readFileSync } from 'fs';
import { join } from 'path';
import { OrderStatus } from '@prisma/client';
import { LOAD_CATEGORIES as API_LOADS, LOAD_CATEGORY_KEYS as API_KEYS } from './load';

/*
 * Cross-package parity. The API hand-mirrors shared runtime constants because it
 * can only TYPE-import the workspace packages at runtime (they ship as unbuilt TS
 * source). So we can't value-import @wash-and-go/domain here — that breaks the API
 * build. Instead we read the domain source as text and extract the values, making
 * the mirrors self-enforcing:
 *  - domain ORDER_STATUSES must equal the Prisma-generated enum (schema truth)
 *  - API + domain load catalogs must agree on keys + estimate kg
 * A drift now fails CI instead of shipping silently.
 */
const DOMAIN = join(__dirname, '../../../../packages/domain/src');
const orderStatusSrc = readFileSync(join(DOMAIN, 'order-status.ts'), 'utf8');
const loadSrc = readFileSync(join(DOMAIN, 'load.ts'), 'utf8');

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
});
