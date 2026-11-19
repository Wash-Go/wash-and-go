import type { PayoutMethod, Shop } from '@prisma/client';

// What any response may carry about a shop's payout account. The full
// number never leaves the API — only its last 4 digits.
export interface PayoutAccountView {
  method: PayoutMethod;
  accountName: string;
  accountNumberMasked: string;
  bankName: string | null;
  updatedAt: string | null;
}

export function maskAccountNumber(n: string): string {
  return `•••• ${n.slice(-4)}`;
}

type PayoutColumns = Pick<
  Shop,
  | 'payoutMethod'
  | 'payoutAccountName'
  | 'payoutAccountNumber'
  | 'payoutBankName'
  | 'payoutUpdatedAt'
>;

export function payoutView(s: PayoutColumns): PayoutAccountView | null {
  if (!s.payoutMethod || !s.payoutAccountNumber) return null;
  return {
    method: s.payoutMethod,
    accountName: s.payoutAccountName ?? '',
    accountNumberMasked: maskAccountNumber(s.payoutAccountNumber),
    bankName: s.payoutBankName,
    updatedAt: s.payoutUpdatedAt ? s.payoutUpdatedAt.toISOString() : null,
  };
}
