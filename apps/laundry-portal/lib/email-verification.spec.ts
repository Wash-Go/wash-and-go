import { RESEND_COOLDOWN_MS, resendWaitSeconds, shouldShowVerifyBanner } from './email-verification';

describe('shouldShowVerifyBanner', () => {
  const base = { devBypass: false, signedIn: true, email: 'a@b.ph', emailVerified: false, dismissed: false };
  it('shows for a signed-in, unverified email account', () => {
    expect(shouldShowVerifyBanner(base)).toBe(true);
  });
  it('hides once verified, dismissed, signed out, or with no email', () => {
    expect(shouldShowVerifyBanner({ ...base, emailVerified: true })).toBe(false);
    expect(shouldShowVerifyBanner({ ...base, dismissed: true })).toBe(false);
    expect(shouldShowVerifyBanner({ ...base, signedIn: false })).toBe(false);
    expect(shouldShowVerifyBanner({ ...base, email: null })).toBe(false);
  });
  it('hides in the dev x-dev-uid stub (no email there)', () => {
    expect(shouldShowVerifyBanner({ ...base, devBypass: true })).toBe(false);
  });
});

describe('resendWaitSeconds', () => {
  it('is 0 when never sent or the cooldown has passed', () => {
    expect(resendWaitSeconds(null, 1_000)).toBe(0);
    expect(resendWaitSeconds(0, RESEND_COOLDOWN_MS)).toBe(0);
  });
  it('counts down whole seconds, rounding up', () => {
    expect(resendWaitSeconds(0, 1)).toBe(60);
    expect(resendWaitSeconds(0, 59_001)).toBe(1);
    expect(resendWaitSeconds(0, 30_000)).toBe(30);
  });
});
