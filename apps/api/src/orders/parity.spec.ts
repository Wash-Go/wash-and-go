import { OrderStatus } from '@prisma/client';
import {
  ORDER_STATUSES as DOMAIN_STATUSES,
  LOAD_CATEGORIES as DOMAIN_LOADS,
  LOAD_CATEGORY_KEYS as DOMAIN_KEYS,
} from '@wash-and-go/domain';
import { LOAD_CATEGORIES as API_LOADS, LOAD_CATEGORY_KEYS as API_KEYS } from './load';

/*
 * Cross-package parity. The API hand-mirrors shared runtime constants (it can
 * only type-only import the workspace packages at runtime). These tests make the
 * mirrors self-enforcing:
 *  - the domain OrderStatus list must equal the Prisma-generated enum (schema truth)
 *  - the API + domain load catalogs must agree on keys + estimate kg
 * A drift now fails CI instead of shipping silently.
 */
describe('cross-package parity', () => {
  it('domain ORDER_STATUSES matches the Prisma schema enum exactly', () => {
    expect([...DOMAIN_STATUSES].sort()).toEqual(Object.values(OrderStatus).sort());
  });

  it('API and domain load categories agree on keys', () => {
    expect([...API_KEYS]).toEqual([...DOMAIN_KEYS]);
  });

  it('API and domain load categories agree on estimate kg per key', () => {
    const kg = (arr: { key: string; estimateKg: number }[]) =>
      arr.map((c) => [c.key, c.estimateKg]);
    expect(kg(API_LOADS)).toEqual(kg(DOMAIN_LOADS));
  });
});
