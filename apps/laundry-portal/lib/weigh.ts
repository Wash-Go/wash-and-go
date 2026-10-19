import {
  loadCategory,
  MAX_WEIGH_KG,
  type OrderStatus,
  type OrderView,
} from '@wash-and-go/domain';

// Weigh-in guards (U0 T3). The weigh-in sets the customer's final bill, so a
// weight far above the booking estimate needs an explicit second confirm, and
// an order can't be marked ready until it has been weighed (the API refuses
// that too). Pure logic, no React, so it runs under the node jest config.

// kg for display: at most two decimals (the DB keeps Decimal(6,2)), no float
// noise, no trailing zeros ("0.4", not "0.40000000000000036").
export function formatKg(kg: number): string {
  return String(Number(kg.toFixed(2)));
}

// The order's expected kg: the estimate recorded at booking when there is one,
// otherwise the load category's representative kg (S/M/L = 3/6/9).
export function orderEstimateKg(
  o: Pick<OrderView, 'weightEstimateKg' | 'loadCategory'>,
): number | null {
  if (o.weightEstimateKg != null) {
    const kg = Number(o.weightEstimateKg);
    if (Number.isFinite(kg) && kg > 0) return kg;
  }
  return (o.loadCategory && loadCategory(o.loadCategory)?.estimateKg) || null;
}

export interface WeighCheck {
  // "1 kg more than the ~6 kg estimate"; null when no estimate is known.
  deltaText: string | null;
  // More than 2× the estimate, or more than 5 kg over it → confirm twice.
  needsSecondConfirm: boolean;
  // "That's 64 kg more than expected. Confirm 70 kg?" when needsSecondConfirm.
  confirmPrompt: string | null;
}

export function weighCheck(enteredKg: number, estimateKg: number | null): WeighCheck {
  if (estimateKg == null) {
    return { deltaText: null, needsSecondConfirm: false, confirmPrompt: null };
  }
  // Compare on 2-decimal values so float noise can't tip a boundary.
  const delta = Number((enteredKg - estimateKg).toFixed(2));
  const est = `~${formatKg(estimateKg)} kg estimate`;
  const deltaText =
    delta > 0
      ? `${formatKg(delta)} kg more than the ${est}`
      : delta < 0
        ? `${formatKg(-delta)} kg less than the ${est}`
        : `Matches the ${est}`;
  const needsSecondConfirm = enteredKg > 2 * estimateKg || delta > 5;
  return {
    deltaText,
    needsSecondConfirm,
    confirmPrompt: needsSecondConfirm
      ? `That's ${formatKg(delta)} kg more than expected. Confirm ${formatKg(enteredKg)} kg?`
      : null,
  };
}

export const READY_NEEDS_WEIGHT = 'Weigh this order before marking it ready.';

// Same bounds and copy as the API's weigh-in validation.
export const WEIGH_RANGE_HINT = `Enter a weight above 0 kg and no more than ${MAX_WEIGH_KG} kg.`;

// Why an action button is disabled, or null when it can be pressed. Mirrors
// the API's READY_FOR_RETURN guard so the shop sees the reason up front.
export function readyBlockedReason(
  o: Pick<OrderView, 'weightKg'>,
  to: OrderStatus,
): string | null {
  return to === 'READY_FOR_RETURN' && o.weightKg == null ? READY_NEEDS_WEIGHT : null;
}
