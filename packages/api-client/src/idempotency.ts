// A client-generated idempotency key for a single logical mutation attempt
// (one booking, one cash deposit). Generate it ONCE when the action starts and
// reuse it across retries so a double-tap / network retry dedupes server-side.
// Uniqueness only needs to hold per client per action — timestamp + randomness
// is plenty; no crypto dependency (Hermes-safe).
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
