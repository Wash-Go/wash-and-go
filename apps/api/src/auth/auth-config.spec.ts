import { assertAuthConfigSafe } from './auth-config';

// A1 (P1): AUTH_DEV_BYPASS must be impossible in production. This is the
// prod-breach guard — a leaked bypass flag lets anyone impersonate any user.
describe('assertAuthConfigSafe', () => {
  it('throws when NODE_ENV=production and dev bypass is enabled', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'production', devBypass: true }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it('allows dev bypass outside production', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'development', devBypass: true }),
    ).not.toThrow();
  });

  it('allows production without dev bypass', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: 'production', devBypass: false }),
    ).not.toThrow();
  });

  it('treats an undefined nodeEnv as non-production', () => {
    expect(() =>
      assertAuthConfigSafe({ nodeEnv: undefined, devBypass: true }),
    ).not.toThrow();
  });
});
