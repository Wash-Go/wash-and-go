import { MONEY_QUERY_OPTIONS, shouldPersistQuery } from './query-cache';

describe('query cache policy', () => {
  it('never persists money or live-ops queries to localStorage', () => {
    expect(shouldPersistQuery(['rider-cash'])).toBe(false);
    expect(shouldPersistQuery(['remittance', 'batches', 'ALL'])).toBe(false);
    expect(shouldPersistQuery(['remittance', 'summary'])).toBe(false);
    expect(shouldPersistQuery(['orders', 'BOOKED', ''])).toBe(false);
  });

  it('keeps persisting slow-changing lists', () => {
    for (const root of ['shops', 'users', 'config', 'zones', 'riders', 'applications']) {
      expect(shouldPersistQuery([root])).toBe(true);
    }
  });

  it('refetches money pages quickly and on window focus', () => {
    expect(MONEY_QUERY_OPTIONS).toEqual({
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    });
  });
});
