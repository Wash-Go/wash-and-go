import type { RiderCashBalance } from '@wash-and-go/domain';
import { owing, totalOutstandingPhp } from './rider-cash';

const row = (riderId: string, outstanding: string): RiderCashBalance => ({
  riderId,
  collectedPhp: '0.00',
  depositedPhp: '0.00',
  outstandingPhp: outstanding,
});

describe('rider-cash helpers', () => {
  it('sums outstanding in centavos (no float drift)', () => {
    expect(
      totalOutstandingPhp([row('a', '145.50'), row('b', '0.10'), row('c', '-50.00')]),
    ).toBe('95.60');
  });

  it('lists only riders who owe, most-owed first', () => {
    const out = owing([row('a', '100'), row('b', '0'), row('c', '250'), row('d', '-5')]);
    expect(out.map((r) => r.riderId)).toEqual(['c', 'a']);
  });
});
