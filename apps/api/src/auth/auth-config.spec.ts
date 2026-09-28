import { assertAuthConfigSafe } from './auth-config';

// A1 (P1): AUTH_DEV_BYPASS must be impossible anywhere but an explicit dev/test
// env. This is the prod-breach guard — a leaked bypass flag lets anyone
// impersonate any user (incl. ADMIN) via the x-dev-uid header. Fail-safe: the
// bypass is allowed ONLY when NODE_ENV is explicitly 'development' or 'test';
// anything else (production, staging, or unset) with the bypass on refuses boot.
describe('assertAuthConfigSafe', () => {
  it('throws when NODE_ENV=production and dev bypass is enabled', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'production', devBypass: true }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it('throws when NODE_ENV is unset and dev bypass is enabled (the deploy hole)', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: undefined, devBypass: true }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it('throws for any non-dev/test env (e.g. staging) with bypass on', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'staging', devBypass: true }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it('allows dev bypass in development', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'development', devBypass: true }),
    ).not.toThrow();
  });

  it('allows dev bypass in test', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'test', devBypass: true }),
    ).not.toThrow();
  });

  it('allows production without dev bypass', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'production', devBypass: false }),
    ).not.toThrow();
  });

  it('allows an unset nodeEnv when bypass is off', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: undefined, devBypass: false }),
    ).not.toThrow();
  });
});
