import { selectLeastLoadedRider } from './auto-dispatch';

describe('selectLeastLoadedRider', () => {
  it('returns null when there are no riders', () => {
    expect(selectLeastLoadedRider([], new Map())).toBeNull();
  });

  it('picks the rider with the fewest active jobs', () => {
    const load = new Map([
      ['a', 3],
      ['b', 1],
      ['c', 5],
    ]);
    expect(selectLeastLoadedRider(['a', 'b', 'c'], load)).toBe('b');
  });

  it('treats a rider absent from the load map as zero', () => {
    const load = new Map([['a', 2]]);
    expect(selectLeastLoadedRider(['a', 'idle'], load)).toBe('idle');
  });

  it('breaks ties by id for determinism', () => {
    const load = new Map([
      ['z', 0],
      ['a', 0],
    ]);
    expect(selectLeastLoadedRider(['z', 'a'], load)).toBe('a');
  });
});
