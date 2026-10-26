import { EXPRESS_TIMELINE, MAX_WEIGH_KG, ORDER_STATUSES } from '@wash-and-go/domain';
import { appVersionLine, emailStatusLine, ORDER_STEPS, PAYOUT_RULES, WEIGH_RULES } from './help';
import { OPS_CONTACT } from './ops-contact';

describe('ORDER_STEPS', () => {
  it('explains every status, timeline first, cancelled last', () => {
    expect(ORDER_STEPS.map((s) => s.status)).toEqual([...EXPRESS_TIMELINE, 'CANCELLED']);
    expect(new Set(ORDER_STEPS.map((s) => s.status))).toEqual(new Set(ORDER_STATUSES));
    for (const s of ORDER_STEPS) expect(s.text.length).toBeGreaterThan(10);
  });

  it('marks the steps where the shop acts', () => {
    expect(ORDER_STEPS.filter((s) => s.shopActs).map((s) => s.status)).toEqual(['AT_SHOP', 'PROCESSING']);
  });
});

describe('WEIGH_RULES', () => {
  it('names the cap and the second-confirm threshold', () => {
    const all = WEIGH_RULES.join(' ');
    expect(all).toContain(`${MAX_WEIGH_KG} kg`);
    expect(all).toMatch(/more than double the estimate or more than 5 kg over it/);
    expect(all).toMatch(/still at the shop/);
    expect(all).not.toMatch(/approval/i);
  });
});

describe('PAYOUT_RULES', () => {
  it('never hardcodes a commission percentage', () => {
    expect(PAYOUT_RULES.join(' ')).not.toMatch(/\d+\s*%/);
  });
});

describe('OPS_CONTACT', () => {
  it('is marked as a placeholder until the founders provide it', () => {
    expect(OPS_CONTACT.placeholder).toBe(true);
  });
});

describe('appVersionLine', () => {
  it('shows the version and a short build id', () => {
    expect(appVersionLine('0.0.1', '1234567890abcdef')).toBe('Version 0.0.1 · build 1234567');
    expect(appVersionLine('0.0.1', '')).toBe('Version 0.0.1');
  });
});

describe('emailStatusLine', () => {
  it('says whether the sign-in email is verified', () => {
    expect(emailStatusLine({ devBypass: true, email: null, emailVerified: undefined })).toBe(
      'Signed in with the developer stub, so there is no email to verify.',
    );
    expect(emailStatusLine({ devBypass: false, email: 'a@b.ph', emailVerified: true })).toBe('a@b.ph is verified.');
    expect(emailStatusLine({ devBypass: false, email: 'a@b.ph', emailVerified: false })).toBe(
      'a@b.ph is not verified yet. Check your inbox for the link.',
    );
    expect(emailStatusLine({ devBypass: false, email: null, emailVerified: undefined })).toBe(
      'No sign-in email on this account.',
    );
  });
});
