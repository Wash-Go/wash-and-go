import { emptyPayoutForm, payoutBody, payoutLine, validatePayout } from './payout';

describe('validatePayout', () => {
  it('GCash needs a name and a PH mobile number', () => {
    expect(validatePayout({ ...emptyPayoutForm('GCASH') })).toEqual({
      accountName: 'Enter the account name.',
      accountNumber: 'Enter the GCash number, e.g. 0917 123 4567.',
    });
    expect(validatePayout({ method: 'GCASH', accountName: 'R. Fernandez', accountNumber: '0917-123-4567', bankName: '' })).toEqual({});
  });

  it('bank needs a bank name and 6–20 digits', () => {
    expect(validatePayout({ method: 'BANK', accountName: 'R', accountNumber: '12 34', bankName: '' })).toEqual({
      accountNumber: 'Enter the account number: 6 to 20 digits.',
      bankName: 'Enter the bank name.',
    });
    expect(validatePayout({ method: 'BANK', accountName: 'R', accountNumber: '1234-5678-9012', bankName: 'BPI' })).toEqual({});
    expect(validatePayout({ method: 'BANK', accountName: 'R', accountNumber: '1'.repeat(21), bankName: 'BPI' }).accountNumber).toBeDefined();
    expect(validatePayout({ method: 'BANK', accountName: 'R', accountNumber: '12345a', bankName: 'BPI' }).accountNumber).toBeDefined();
  });

  it('caps the name lengths', () => {
    expect(validatePayout({ method: 'GCASH', accountName: 'x'.repeat(121), accountNumber: '09171234567', bankName: '' }).accountName).toBe(
      'Keep the name to 120 characters.',
    );
  });
});

describe('payoutBody', () => {
  it('GCash sends no bank name', () => {
    expect(payoutBody({ method: 'GCASH', accountName: ' R. Fernandez ', accountNumber: '0917 123 4567', bankName: 'BPI' })).toEqual({
      method: 'GCASH',
      accountName: 'R. Fernandez',
      accountNumber: '0917 123 4567',
    });
  });
  it('bank sends digits only and the bank', () => {
    expect(payoutBody({ method: 'BANK', accountName: 'R', accountNumber: '1234-5678 9012', bankName: ' BPI ' })).toEqual({
      method: 'BANK',
      accountName: 'R',
      accountNumber: '123456789012',
      bankName: 'BPI',
    });
  });
});

describe('payoutLine', () => {
  it('shows the method and the masked number only', () => {
    expect(
      payoutLine({ method: 'GCASH', accountName: 'R', accountNumberMasked: '•••• 4567', bankName: null, updatedAt: null }),
    ).toBe('GCash · •••• 4567');
    expect(
      payoutLine({ method: 'BANK', accountName: 'R', accountNumberMasked: '•••• 9012', bankName: 'BPI', updatedAt: null }),
    ).toBe('BPI · •••• 9012');
  });
});
