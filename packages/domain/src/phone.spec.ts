import {
  PLACEHOLDER_PHONE_PREFIX,
  callablePhone,
  formatPhMobile,
  isPlaceholderPhone,
  normalizePhMobile,
} from './phone';

// The API mirrors normalizePhMobile (apps/api/src/users/phone.ts) and its
// parity spec runs this same kind of table through both copies.
describe('normalizePhMobile', () => {
  it.each([
    ['09171234567', '+639171234567'],
    ['9171234567', '+639171234567'],
    ['+639171234567', '+639171234567'],
    ['639171234567', '+639171234567'],
    ['0917 123 4567', '+639171234567'],
    ['0917-123-4567', '+639171234567'],
    ['+63 917 123 4567', '+639171234567'],
    ['  09171234567  ', '+639171234567'],
    ['0999-999 9999', '+639999999999'],
  ])('accepts %p as %p', (raw, e164) => {
    expect(normalizePhMobile(raw)).toBe(e164);
  });

  it.each([
    '',
    '   ',
    '0917123456', // 10 digits with the leading 0: one short
    '091712345678', // one too many
    '08171234567', // not a 9-prefixed mobile
    '+6309171234567', // country code AND trunk 0
    '+1 917 123 4567',
    '0063 917 123 4567',
    '(0917) 123 4567', // only spaces and dashes are stripped
    '0917.123.4567',
    '09l71234567',
    'pending:abc123',
    '+63917123456a',
  ])('rejects %p', (raw) => {
    expect(normalizePhMobile(raw)).toBeNull();
  });
});

describe('placeholder phones', () => {
  it('recognizes the pending:<uid> placeholder', () => {
    expect(PLACEHOLDER_PHONE_PREFIX).toBe('pending:');
    expect(isPlaceholderPhone('pending:fb-uid-1')).toBe(true);
    expect(isPlaceholderPhone('+639171234567')).toBe(false);
  });

  it('callablePhone drops placeholders and blanks, keeps real numbers', () => {
    expect(callablePhone('+639171234567')).toBe('+639171234567');
    expect(callablePhone('pending:fb-uid-1')).toBeNull();
    expect(callablePhone('')).toBeNull();
    expect(callablePhone(null)).toBeNull();
    expect(callablePhone(undefined)).toBeNull();
  });
});

describe('formatPhMobile', () => {
  it('shows a stored E.164 PH mobile in the local 0917 123 4567 form', () => {
    expect(formatPhMobile('+639171234567')).toBe('0917 123 4567');
  });

  it('leaves anything else untouched', () => {
    expect(formatPhMobile('+15551234567')).toBe('+15551234567');
  });
});
