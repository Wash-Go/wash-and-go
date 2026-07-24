import type { OrderView } from '@wash-and-go/domain';
import { canWeigh, parseWeight } from './shop';

const o = (over: Partial<OrderView>): OrderView => ({ status: 'AT_SHOP', ...over }) as OrderView;

describe('shop logic', () => {
  it('allows weigh only at the shop', () => {
    expect(canWeigh(o({ status: 'AT_SHOP' }))).toBe(true);
    expect(canWeigh(o({ status: 'PROCESSING' }))).toBe(true);
    expect(canWeigh(o({ status: 'ASSIGNED' }))).toBe(false);
    expect(canWeigh(o({ status: 'DELIVERED' }))).toBe(false);
  });

  it('validates weight: positive, <= 100kg', () => {
    expect(parseWeight('6.4')).toEqual({ ok: true, kg: 6.4 });
    expect(parseWeight('0').ok).toBe(false);
    expect(parseWeight('-3').ok).toBe(false);
    expect(parseWeight('200').ok).toBe(false);
    expect(parseWeight('abc').ok).toBe(false);
  });
});
