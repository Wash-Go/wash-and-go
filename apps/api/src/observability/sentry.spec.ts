import { captureException, initSentry, sentryEnabled } from './sentry';

// The value in shipping inert: no DSN → fully disabled, and captureException is
// a safe no-op so the exception filter never depends on Sentry being configured.
describe('sentry (env-gated)', () => {
  const original = process.env.SENTRY_DSN;
  afterEach(() => {
    if (original == null) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = original;
  });

  it('initSentry is a no-op and reports disabled when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;
    expect(initSentry()).toBe(false);
    expect(sentryEnabled()).toBe(false);
  });

  it('captureException does not throw when disabled', () => {
    delete process.env.SENTRY_DSN;
    initSentry();
    expect(() => captureException(new Error('boom'), { url: '/x' })).not.toThrow();
  });
});
