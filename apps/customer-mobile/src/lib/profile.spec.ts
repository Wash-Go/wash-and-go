import {
  DUPLICATE_PHONE_MESSAGE,
  PHONE_HINT,
  needsMobileNumber,
  profileSaveErrorMessage,
  validateContact,
} from './profile';

describe('validateContact (sign-up + Your details, which the booking gate opens)', () => {
  it('trims the name and normalizes the mobile number to +639XXXXXXXXX', () => {
    expect(validateContact({ name: '  Ana Cruz ', phone: '0917 123-4567' })).toEqual({
      ok: true,
      name: 'Ana Cruz',
      phone: '+639171234567',
    });
  });

  // Same accepted forms as the API (the rule is the shared domain function).
  it.each(['09171234567', '9171234567', '+639171234567', '639171234567'])(
    'accepts %p',
    (phone) => {
      expect(validateContact({ name: 'Ana', phone })).toMatchObject({
        ok: true,
        phone: '+639171234567',
      });
    },
  );

  it.each(['', '0917123456', '08171234567', '+1 917 123 4567', '(0917) 123 4567'])(
    'rejects %p with the hint',
    (phone) => {
      expect(validateContact({ name: 'Ana', phone })).toEqual({
        ok: false,
        errors: { phone: PHONE_HINT },
      });
    },
  );

  it('requires a name', () => {
    expect(validateContact({ name: '   ', phone: '09171234567' })).toEqual({
      ok: false,
      errors: { name: 'Enter your name.' },
    });
  });

  // Every screen (sign-up, Your details, the booking gate) passes a name too;
  // this pins the helper's number-only mode.
  it('can check the phone alone when no name is passed', () => {
    expect(validateContact({ phone: '09171234567' })).toEqual({
      ok: true,
      phone: '+639171234567',
    });
  });

  it('reports both problems at once', () => {
    expect(validateContact({ name: '', phone: '123' })).toEqual({
      ok: false,
      errors: { name: 'Enter your name.', phone: PHONE_HINT },
    });
  });
});

describe('needsMobileNumber', () => {
  it('is true only while the account has no number', () => {
    expect(needsMobileNumber({ phone: null })).toBe(true);
    expect(needsMobileNumber({ phone: '+639171234567' })).toBe(false);
  });
});

describe('profileSaveErrorMessage', () => {
  it('a 409 is the duplicate-number copy', () => {
    expect(profileSaveErrorMessage({ status: 409, message: 'x' })).toBe(
      DUPLICATE_PHONE_MESSAGE,
    );
    expect(DUPLICATE_PHONE_MESSAGE).toBe(
      'That mobile number is already used by another account.',
    );
  });

  it('a 400 points at the number format', () => {
    expect(profileSaveErrorMessage({ status: 400, message: 'raw' })).toBe(PHONE_HINT);
  });

  it('no status means the server was unreachable', () => {
    expect(profileSaveErrorMessage(new TypeError('Network request failed'))).toBe(
      "Can't reach the Wash & Go server. Check your connection and try again.",
    );
  });

  it('401/403 asks to sign in again, 429 to wait', () => {
    expect(profileSaveErrorMessage({ status: 401 })).toBe(
      "We couldn't verify your sign-in. Please sign in again.",
    );
    expect(profileSaveErrorMessage({ status: 403 })).toBe(
      "We couldn't verify your sign-in. Please sign in again.",
    );
    expect(profileSaveErrorMessage({ status: 429 })).toBe(
      'Too many attempts — try again in a minute.',
    );
  });

  it('anything else is generic and never leaks server text', () => {
    const msg = profileSaveErrorMessage({ status: 500, message: 'Internal server error' });
    expect(msg).toBe("Couldn't save your details. Try again in a moment.");
  });
});
