import { authErrorMessage, profileSaveErrors, resetPasswordCopy, validateSignup } from './auth-copy';

describe('authErrorMessage', () => {
  it('maps sign-in failures to human copy with a next step', () => {
    expect(authErrorMessage('auth/invalid-credential', 'signin')).toBe(
      "That password doesn't match this email. Try again, or reset it below.",
    );
    expect(authErrorMessage('auth/too-many-requests', 'signin')).toMatch(/Too many attempts/);
    expect(authErrorMessage('auth/network-request-failed', 'signin')).toMatch(/connection/);
  });

  it('maps sign-up failures', () => {
    expect(authErrorMessage('auth/email-already-in-use', 'signup')).toBe(
      'That email already has an account. Sign in instead.',
    );
    expect(authErrorMessage('auth/weak-password', 'signup')).toMatch(/at least 8/);
  });

  it('never leaks the raw code', () => {
    expect(authErrorMessage('auth/some-new-thing', 'signin')).not.toMatch(/auth\//);
    expect(authErrorMessage(undefined, 'signup')).not.toMatch(/undefined/);
  });
});

describe('resetPasswordCopy', () => {
  it('confirms without saying whether the account exists', () => {
    expect(resetPasswordCopy({ ok: true }, 'a@b.ph')).toBe(
      'If a@b.ph has an account, a reset link is on its way. Check your inbox and spam folder.',
    );
    // user-not-found reads the same, so the form never confirms an account.
    expect(resetPasswordCopy({ ok: false, code: 'auth/user-not-found' }, 'a@b.ph')).toBe(
      resetPasswordCopy({ ok: true }, 'a@b.ph'),
    );
  });

  it('asks for an email first', () => {
    expect(resetPasswordCopy({ ok: false, code: 'auth/missing-email' }, '')).toBe(
      'Type your email above first, then tap Forgot password.',
    );
    expect(resetPasswordCopy({ ok: false, code: 'auth/invalid-email' }, 'x')).toBe(
      'That email looks incomplete. Check it and try again.',
    );
  });
});

describe('validateSignup', () => {
  const good = {
    name: 'Lorna Santos',
    email: 'lorna@tetuanhub.ph',
    password: 'longenough',
    phone: '0917 123 4567',
  };

  it('accepts a complete form and normalises the mobile number', () => {
    expect(validateSignup(good)).toEqual({
      ok: true,
      value: { name: 'Lorna Santos', email: 'lorna@tetuanhub.ph', password: 'longenough', phone: '+639171234567' },
    });
  });

  it('uses the shared PH mobile validator', () => {
    for (const phone of ['09171234567', '+639171234567', '9171234567', '0917-123-4567']) {
      expect(validateSignup({ ...good, phone }).ok).toBe(true);
    }
    const r = validateSignup({ ...good, phone: '0817 123 4567' });
    expect(r).toEqual({ ok: false, errors: { phone: 'Enter a Philippine mobile number, like 0917 123 4567.' } });
  });

  it('flags each missing or bad field', () => {
    const r = validateSignup({ name: ' ', email: 'nope', password: 'short', phone: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'name', 'password', 'phone']);
  });
});

describe('profileSaveErrors (PATCH /auth/me during sign-up)', () => {
  const err = (status: number, message?: unknown) => ({ status, body: message === undefined ? undefined : { message } });

  it('puts a duplicate number on the phone field', () => {
    expect(profileSaveErrors(err(409))).toEqual({
      fields: { phone: 'That mobile number is already used by another account.' },
    });
  });

  it('maps a 400 to the field the API names', () => {
    expect(profileSaveErrors(err(400, 'Enter a Philippine mobile number, like 0917 123 4567.'))).toEqual({
      fields: { phone: 'Enter a Philippine mobile number, like 0917 123 4567.' },
    });
    expect(profileSaveErrors(err(400, ['phone must be shorter than or equal to 32 characters']))).toEqual({
      fields: { phone: 'Enter a Philippine mobile number, like 0917 123 4567.' },
    });
    expect(profileSaveErrors(err(400, ['name must be shorter than or equal to 80 characters']))).toEqual({
      fields: { name: 'Keep your name under 80 characters.' },
    });
    expect(profileSaveErrors(err(400, 'Enter your name.'))).toEqual({ fields: { name: 'Enter your name.' } });
  });

  it('falls back to a general message for an unattributed 400', () => {
    expect(profileSaveErrors(err(400))).toEqual({ general: 'Check your name and mobile number, then try again.' });
    expect(profileSaveErrors(err(400, 'Bad Request'))).toEqual({
      general: 'Check your name and mobile number, then try again.',
    });
  });

  it('says the account exists for anything else', () => {
    expect(profileSaveErrors(err(500))).toEqual({
      general: "Your account is made, but we couldn't save your details. Try again.",
    });
    expect(profileSaveErrors(new Error('offline'))).toEqual({
      general: "Your account is made, but we couldn't save your details. Try again.",
    });
  });
});
