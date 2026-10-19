import { NEW_RING_MS, emptyNewOrders, isNewOrder, trackNewOrders } from './new-orders';

const T0 = 1_000_000;

describe('trackNewOrders', () => {
  it('never rings on the first load after boot', () => {
    const { state, arrived } = trackNewOrders(emptyNewOrders, ['a', 'b'], T0);
    expect(arrived).toEqual([]);
    expect(isNewOrder(state, 'a', T0)).toBe(false);
  });

  it('rings an id first seen on a later poll, for 60 s', () => {
    let s = trackNewOrders(emptyNewOrders, ['a'], T0).state;
    const r = trackNewOrders(s, ['c', 'a'], T0 + 5_000);
    s = r.state;
    expect(r.arrived).toEqual(['c']);
    expect(isNewOrder(s, 'c', T0 + 5_000)).toBe(true);
    expect(isNewOrder(s, 'a', T0 + 5_000)).toBe(false);
    expect(isNewOrder(s, 'c', T0 + 5_000 + NEW_RING_MS - 1)).toBe(true);
    expect(isNewOrder(s, 'c', T0 + 5_000 + NEW_RING_MS)).toBe(false);
  });

  it('does not ring again for an id already rung or seen', () => {
    let s = trackNewOrders(emptyNewOrders, [], T0).state;
    s = trackNewOrders(s, ['c'], T0 + 5_000).state;
    const again = trackNewOrders(s, ['c'], T0 + 10_000);
    expect(again.arrived).toEqual([]);
    expect(isNewOrder(again.state, 'c', T0 + 10_000)).toBe(true);
  });

  it('does not ring an order that left and came back', () => {
    let s = trackNewOrders(emptyNewOrders, ['a'], T0).state;
    s = trackNewOrders(s, [], T0 + 5_000).state;
    const back = trackNewOrders(s, ['a'], T0 + 10_000);
    expect(back.arrived).toEqual([]);
  });

  it('forgets expired rings', () => {
    let s = trackNewOrders(emptyNewOrders, [], T0).state;
    s = trackNewOrders(s, ['c'], T0).state;
    s = trackNewOrders(s, ['c'], T0 + NEW_RING_MS + 1).state;
    expect(Object.keys(s.fresh)).toEqual([]);
  });

  it('returns the same state object when nothing changed', () => {
    const s = trackNewOrders(emptyNewOrders, ['a'], T0).state;
    expect(trackNewOrders(s, ['a'], T0 + 5_000).state).toBe(s);
  });
});
