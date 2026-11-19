import { normalizePhMobile, type PayoutAccountView, type PayoutMethod, type PutPayoutAccountBody } from '@wash-and-go/domain';

// Payout account form (Shop → Payout account, OWNER only). Rules match
// PUT /shop/payout-account: GCash = a PH mobile; bank = 6–20 digits (spaces
// and dashes ignored) plus a bank name. The full number only ever lives in
// this form's state; the API returns "•••• 1234" and nothing here logs it.

export type PayoutForm = { method: PayoutMethod; accountName: string; accountNumber: string; bankName: string };

export const METHOD_LABEL: Record<PayoutMethod, string> = { GCASH: 'GCash', BANK: 'Bank' };
const MAX_NAME = 120;

export function emptyPayoutForm(method: PayoutMethod = 'GCASH'): PayoutForm {
  return { method, accountName: '', accountNumber: '', bankName: '' };
}

const bankDigits = (raw: string) => raw.replace(/[\s-]/g, '');

export function validatePayout(f: PayoutForm): Record<string, string> {
  const e: Record<string, string> = {};
  const name = f.accountName.trim();
  if (!name) e.accountName = 'Enter the account name.';
  else if (name.length > MAX_NAME) e.accountName = 'Keep the name to 120 characters.';
  if (f.method === 'GCASH') {
    if (!normalizePhMobile(f.accountNumber)) e.accountNumber = 'Enter the GCash number, e.g. 0917 123 4567.';
  } else {
    if (!/^\d{6,20}$/.test(bankDigits(f.accountNumber))) e.accountNumber = 'Enter the account number: 6 to 20 digits.';
    const bank = f.bankName.trim();
    if (!bank) e.bankName = 'Enter the bank name.';
    else if (bank.length > MAX_NAME) e.bankName = 'Keep the bank name to 120 characters.';
  }
  return e;
}

export function payoutBody(f: PayoutForm): PutPayoutAccountBody {
  const accountName = f.accountName.trim();
  if (f.method === 'GCASH') return { method: 'GCASH', accountName, accountNumber: f.accountNumber.trim() };
  return { method: 'BANK', accountName, accountNumber: bankDigits(f.accountNumber), bankName: f.bankName.trim() };
}

// "GCash · •••• 4567" / "BPI · •••• 9012". Masked only.
export function payoutLine(a: PayoutAccountView): string {
  const where = a.method === 'BANK' && a.bankName ? a.bankName : METHOD_LABEL[a.method];
  return `${where} · ${a.accountNumberMasked}`;
}
