import { ORDER_STATUSES, STATUS_META, type OrderView } from '@wash-and-go/domain';
import {
  BUCKET_STATUSES,
  QUEUE_PAGE,
  QUEUE_TABS,
  badgeTitle,
  bucketOf,
  cardMeta,
  countLabel,
  firstName,
  mergeOrders,
  primaryAction,
} from './queue';

const o = (over: Partial<OrderView>): OrderView =>
  ({
    id: 'o1',
    code: 'WG-2026-000147',
    status: 'AT_SHOP',
    serviceType: 'EXPRESS',
    shopServiceId: 'ss1',
    weightKg: null,
    weightEstimateKg: '3',
    loadCategory: 'S',
    availableActions: ['PROCESSING'],
    customer: { id: 'c1', displayName: 'Maria Santos' },
    ...over,
  }) as OrderView;

describe('queue tabs', () => {
  it('has the four designed tabs in order', () => {
    expect(QUEUE_TABS.map((t) => t.label)).toEqual(['Needs you', 'Washing', 'Ready', 'Done']);
  });

  it('puts every order status in exactly one bucket', () => {
    const all = Object.values(BUCKET_STATUSES).flat();
    expect([...all].sort()).toEqual([...ORDER_STATUSES].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it('maps statuses to the shop-facing buckets', () => {
    expect(BUCKET_STATUSES.incoming).toEqual(['BOOKED', 'ASSIGNED', 'PICKED_UP']);
    expect(BUCKET_STATUSES.needs).toEqual(['AT_SHOP']);
    expect(BUCKET_STATUSES.washing).toEqual(['PROCESSING']);
    expect(BUCKET_STATUSES.ready).toEqual(['READY_FOR_RETURN', 'OUT_FOR_RETURN']);
    expect(BUCKET_STATUSES.done).toEqual(['DELIVERED', 'CANCELLED']);
  });

  it('agrees with the domain: Done is exactly the terminal statuses, Incoming is before the shop', () => {
    for (const s of ORDER_STATUSES) {
      expect(bucketOf(s) === 'done').toBe(STATUS_META[s].terminal);
      if (!STATUS_META[s].terminal) {
        expect(bucketOf(s) === 'incoming').toBe(STATUS_META[s].step < STATUS_META.AT_SHOP.step);
      }
    }
  });
});

describe('countLabel', () => {
  it('shows the count, or N+ when the page came back full', () => {
    expect(countLabel(0, false)).toBe('0');
    expect(countLabel(3, false)).toBe('3');
    expect(countLabel(QUEUE_PAGE, true)).toBe(`${QUEUE_PAGE}+`);
  });
});

describe('primaryAction', () => {
  it('asks for a weight first while at the shop', () => {
    expect(primaryAction(o({}))).toEqual({ kind: 'weigh', label: 'Weigh', icon: 'scale' });
  });

  it('offers Mark washing once weighed', () => {
    expect(primaryAction(o({ weightKg: '7.2' }))).toEqual({
      kind: 'status',
      to: 'PROCESSING',
      label: 'Mark washing',
      icon: 'shirt',
    });
  });

  it('offers Ready for pickup while washing and weighed', () => {
    expect(
      primaryAction(o({ status: 'PROCESSING', weightKg: '7', availableActions: ['READY_FOR_RETURN'] })),
    ).toEqual({ kind: 'status', to: 'READY_FOR_RETURN', label: 'Ready for pickup', icon: 'package' });
  });

  it('asks for a weight while washing if it was never weighed (ready needs a weight)', () => {
    expect(
      primaryAction(o({ status: 'PROCESSING', availableActions: ['READY_FOR_RETURN'] }))?.kind,
    ).toBe('weigh');
  });

  it('offers no transition the API does not allow this actor', () => {
    expect(primaryAction(o({ weightKg: '7', availableActions: [] }))).toBeNull();
  });

  it('cannot weigh without a shop service to price against', () => {
    expect(primaryAction(o({ shopServiceId: null, availableActions: [] }))).toBeNull();
  });

  it('has no action outside the shop steps', () => {
    for (const status of ['BOOKED', 'PICKED_UP', 'READY_FOR_RETURN', 'DELIVERED', 'CANCELLED'] as const) {
      expect(primaryAction(o({ status, weightKg: '7', availableActions: [] }))).toBeNull();
    }
  });
});

describe('cardMeta', () => {
  it('names the customer, service and load size before weighing', () => {
    expect(cardMeta(o({}))).toBe('Maria · Express · Small (~3 kg)');
  });

  it('shows the weighed kg once weighed', () => {
    expect(cardMeta(o({ serviceType: 'SCHEDULED', weightKg: '7.20' }))).toBe('Maria · Scheduled · Weighed 7.2 kg');
  });

  it('falls back to the estimate kg with no load category', () => {
    expect(cardMeta(o({ loadCategory: null, weightEstimateKg: '4.5' }))).toBe('Maria · Express · ~4.5 kg');
  });

  it('leaves out what it does not know', () => {
    expect(cardMeta(o({ customer: undefined, loadCategory: null, weightEstimateKg: null }))).toBe('Express');
  });
});

describe('firstName', () => {
  it('takes the first word, or nothing', () => {
    expect(firstName('Maria Santos')).toBe('Maria');
    expect(firstName('  Jun ')).toBe('Jun');
    expect(firstName('')).toBe('');
    expect(firstName(undefined)).toBe('');
  });
});

describe('mergeOrders', () => {
  it('appends later pages without duplicates, keeping the fresher copy', () => {
    const a = o({ id: 'a', weightKg: null });
    const b = o({ id: 'b' });
    const a2 = o({ id: 'a', weightKg: '5' });
    expect(mergeOrders([a2], [a, b]).map((x) => [x.id, x.weightKg])).toEqual([
      ['a', '5'],
      ['b', null],
    ]);
  });
});

describe('badgeTitle', () => {
  it('prefixes the needs-you count and replaces an old one', () => {
    expect(badgeTitle(3, 'Orders · Wash & Go')).toBe('(3) Orders · Wash & Go');
    expect(badgeTitle(0, '(3) Orders · Wash & Go')).toBe('Orders · Wash & Go');
    expect(badgeTitle(12, '(3) Help · Wash & Go Partner')).toBe('(12) Help · Wash & Go Partner');
  });
});
