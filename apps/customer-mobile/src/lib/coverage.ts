import { OUTSIDE_COVERAGE_MESSAGE as API_OUTSIDE_COVERAGE } from '@wash-and-go/domain';

// Plain-words copy for the API's out-of-area answer (U0 T6). Quote and create
// both refuse a pickup outside the service zones with this exact 400 (the
// shared domain constant, which the API's parity.spec.ts pins), so the checkout
// shows it before any price instead of failing at Confirm. The API has no
// customer-facing zone names, so the copy stays generic.

export const OUT_OF_COVERAGE_MESSAGE =
  "We don't pick up there yet. Wash & Go currently serves a limited area, so please choose a different pickup point.";

// Duck-typed on ApiError's shape so this stays a pure helper.
export function isOutOfCoverage(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const status = (e as { status?: unknown }).status;
  return status === 400 && e.message === API_OUTSIDE_COVERAGE;
}

// The message a booking screen shows for a failed quote or create: the
// out-of-area answer in plain words, any other API message as-is, else the
// screen's own fallback.
export function bookingErrorMessage(e: unknown, fallback: string): string {
  if (isOutOfCoverage(e)) return OUT_OF_COVERAGE_MESSAGE;
  return e instanceof Error && e.message ? e.message : fallback;
}
