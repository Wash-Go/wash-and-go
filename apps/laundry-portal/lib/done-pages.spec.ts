import type { OrderView } from '@wash-and-go/domain';
import { applyDonePages, doneView, parseDonePage, type DonePages } from './done-pages';

const o = (id: string, status: 'DELIVERED' | 'CANCELLED', createdAt: string, over: Partial<OrderView> = {}) =>
  ({ id, code: `WG-2026-${id}`, status, createdAt, ...over }) as OrderView;

const d1 = o('d1', 'DELIVERED', '2026-10-19T05:00:00Z');
const d2 = o('d2', 'DELIVERED', '2026-10-19T03:00:00Z');
const d3 = o('d3', 'DELIVERED', '2026-10-19T01:00:00Z');
const c1 = o('c1', 'CANCELLED', '2026-10-19T04:00:00Z');
const c2 = o('c2', 'CANCELLED', '2026-10-19T02:00:00Z');

describe('doneView', () => {
  it('is not ready until every status has its first page', () => {
    expect(doneView({ DELIVERED: [d1] }, {}, 2).ready).toBe(false);
  });

  it('merges the statuses newest first', () => {
    const v = doneView({ DELIVERED: [d1, d2], CANCELLED: [c1] }, {}, 5);
    expect(v.ready).toBe(true);
    expect(v.orders.map((x) => x.id)).toEqual(['d1', 'c1', 'd2']);
  });

  it('offers more (N+) only while some status filled its last page', () => {
    expect(doneView({ DELIVERED: [d1, d2], CANCELLED: [c1] }, {}, 2).canMore).toBe(true);
    expect(doneView({ DELIVERED: [d1], CANCELLED: [c1] }, {}, 2).canMore).toBe(false);
  });

  it('gives a cursor per status: the oldest row loaded for that status', () => {
    const v = doneView({ DELIVERED: [d1, d2], CANCELLED: [c1, c2] }, {}, 2);
    expect(v.next).toEqual([
      { status: 'DELIVERED', before: 'd2' },
      { status: 'CANCELLED', before: 'c2' },
    ]);
  });

  it('asks only the statuses that still have more', () => {
    const v = doneView({ DELIVERED: [d1, d2], CANCELLED: [c1] }, {}, 2);
    expect(v.next).toEqual([{ status: 'DELIVERED', before: 'd2' }]);
  });
});

describe('applyDonePages', () => {
  it('appends a loaded page, keeps the first-page snapshot and moves the cursor', () => {
    const firsts = { DELIVERED: [d1, d2], CANCELLED: [c1] };
    const pages = applyDonePages({}, firsts, [{ status: 'DELIVERED', page: [d3] }], 2);
    expect(pages.DELIVERED).toEqual({ items: [d1, d2, d3], exhausted: true });
    const v = doneView(firsts, pages, 2);
    expect(v.orders.map((x) => x.id)).toEqual(['d1', 'c1', 'd2', 'd3']);
    expect(v.canMore).toBe(false);
    expect(v.next).toEqual([]);
  });

  it('marks each status exhausted on its own', () => {
    let pages: DonePages = {};
    const firsts = { DELIVERED: [d1], CANCELLED: [c1] };
    pages = applyDonePages(pages, firsts, [{ status: 'DELIVERED', page: [d2] }], 1);
    expect(pages.DELIVERED?.exhausted).toBe(false);
    expect(doneView(firsts, pages, 1).next).toEqual([
      { status: 'DELIVERED', before: 'd2' },
      { status: 'CANCELLED', before: 'c1' },
    ]);
    pages = applyDonePages(pages, firsts, [{ status: 'DELIVERED', page: [] }], 1);
    expect(pages.DELIVERED?.exhausted).toBe(true);
    expect(doneView(firsts, pages, 1).next).toEqual([{ status: 'CANCELLED', before: 'c1' }]);
  });

  it('dedupes on re-poll and lets the polled copy win', () => {
    const firsts = { DELIVERED: [d1, d2], CANCELLED: [] };
    const pages = applyDonePages({}, firsts, [{ status: 'DELIVERED', page: [d3] }], 2);
    // A new delivery arrives: the polled first page shifts, d2 slides off it.
    const d0 = o('d0', 'DELIVERED', '2026-10-19T06:00:00Z');
    const rated = { ...d1, ratedStars: 5 };
    const v = doneView({ DELIVERED: [d0, rated], CANCELLED: [] }, pages, 2);
    expect(v.orders.map((x) => x.id)).toEqual(['d0', 'd1', 'd2', 'd3']);
    expect(v.orders.find((x) => x.id === 'd1')?.ratedStars).toBe(5);
  });
});

describe('parseDonePage', () => {
  it('reads a page-size override within 1..100, else the default', () => {
    expect(parseDonePage(null)).toBe(100);
    expect(parseDonePage('5')).toBe(5);
    expect(parseDonePage('0')).toBe(100);
    expect(parseDonePage('500')).toBe(100);
    expect(parseDonePage('x')).toBe(100);
  });
});
