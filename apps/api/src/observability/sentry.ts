import * as Sentry from '@sentry/node';

/*
 * Sentry error tracking, env-gated (Tier 1 observability). Ships INERT: with no
 * SENTRY_DSN set, init is a no-op and captureException does nothing — so dev,
 * CI, and any deploy without a DSN behave exactly as before. Set SENTRY_DSN in
 * the prod env (free-tier project) to switch it on with zero code change.
 *
 * Errors-only by default (tracesSampleRate 0) — the free tier's quota is small,
 * and unhandled server errors are the signal that matters. Opt into perf tracing
 * with SENTRY_TRACES_SAMPLE_RATE.
 */
let enabled = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  enabled = true;
  return true;
}

export function sentryEnabled(): boolean {
  return enabled;
}

// Report a server-side error with request correlation. No-op until initSentry
// succeeds, so callers never need to guard.
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
