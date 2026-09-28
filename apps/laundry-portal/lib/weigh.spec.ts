import type { OrderView } from '@wash-and-go/domain';
import {
  formatKg,
  orderEstimateKg,
  readyBlockedReason,
  weighCheck,
} from './weigh';

const o = (over: Partial<OrderView>): OrderView =>
  ({ status: 'PROCESSING', weightKg: null, weightEstimateKg: null, loadCategory: null, ...over }) as OrderView;

describe('formatKg', () => {
  it('shows at most two decimals and no float noise', () => {
    expect(formatKg(64)).toBe('64');
    expect(formatKg(6.4 - 6)).toBe('0.4');
    expect(formatKg(4.456)).toBe('4.46');
    expect(formatKg(7.5)).toBe('7.5');
  });
});

describe('orderEstimateKg', () => {
  it('uses the recorded booking estimate when there is one', () => {
    expect(orderEstimateKg(o({ weightEstimateKg: '6.00', loadCategory: 'L' }))).toBe(6);
  });

  it('falls back to the load-category kg (S/M/L = 3/6/9)', () => {
    expect(orderEstimateKg(o({ loadCategory: 'S' }))).toBe(3);
    expect(orderEstimateKg(o({ loadCategory: 'M' }))).toBe(6);
    expect(orderEstimateKg(o({ loadCategory: 'L' }))).toBe(9);
  });

  it('is null when neither is known', () => {
    expect(orderEstimateKg(o({}))).toBeNull();
    expect(orderEstimateKg(o({ loadCategory: 'XL' }))).toBeNull();
    expect(orderEstimateKg(o({ weightEstimateKg: 'abc' }))).toBeNull();
  });
});

describe('weighCheck (second confirm when > 2× the estimate or > estimate + 5 kg)', () => {
  it('uses the exact copy for a big overshoot', () => {
    const r = weighCheck(70, 6);
    expect(r.needsSecondConfirm).toBe(true);
    expect(r.confirmPrompt).toBe("That's 64 kg more than expected. Confirm 70 kg?");
  });

  it('does not ask twice for a normal weigh-in', () => {
    const r = weighCheck(7, 6);
    expect(r.needsSecondConfirm).toBe(false);
    expect(r.confirmPrompt).toBeNull();
    expect(r.deltaText).toBe('1 kg more than the ~6 kg estimate');
  });

  it('describes a lighter load and an exact match', () => {
    expect(weighCheck(5.5, 6).deltaText).toBe('0.5 kg less than the ~6 kg estimate');
    expect(weighCheck(6, 6).deltaText).toBe('Matches the ~6 kg estimate');
    expect(weighCheck(1, 9).needsSecondConfirm).toBe(false); // lighter never asks twice
  });

  it('triggers on "more than 2× the estimate" (small loads)', () => {
    // Small (3kg): 2× = 6, +5 = 8 → the 2× rule bites first.
    expect(weighCheck(6, 3).needsSecondConfirm).toBe(false); // exactly 2×
    expect(weighCheck(6.01, 3).needsSecondConfirm).toBe(true);
    expect(weighCheck(6.01, 3).confirmPrompt).toBe(
      "That's 3.01 kg more than expected. Confirm 6.01 kg?",
    );
  });

  it('triggers on "more than +5 kg over" (large loads)', () => {
    // Large (9kg): +5 = 14, 2× = 18 → the +5 rule bites first.
    expect(weighCheck(14, 9).needsSecondConfirm).toBe(false); // exactly +5
    expect(weighCheck(14.1, 9).needsSecondConfirm).toBe(true);
    // Medium (6kg): +5 = 11, 2× = 12.
    expect(weighCheck(11, 6).needsSecondConfirm).toBe(false);
    expect(weighCheck(11.5, 6).needsSecondConfirm).toBe(true);
  });

  it('shows no delta and asks nothing extra when the estimate is unknown', () => {
    const r = weighCheck(40, null);
    expect(r).toEqual({ deltaText: null, needsSecondConfirm: false, confirmPrompt: null });
  });
});

describe('readyBlockedReason', () => {
  it('blocks "ready" until the order has a recorded weight', () => {
    expect(readyBlockedReason(o({ weightKg: null }), 'READY_FOR_RETURN')).toBe(
      'Weigh this order before marking it ready.',
    );
  });

  it('allows "ready" once weighed, and never blocks other actions', () => {
    expect(readyBlockedReason(o({ weightKg: '6.40' }), 'READY_FOR_RETURN')).toBeNull();
    expect(readyBlockedReason(o({ status: 'AT_SHOP', weightKg: null }), 'PROCESSING')).toBeNull();
  });
});
