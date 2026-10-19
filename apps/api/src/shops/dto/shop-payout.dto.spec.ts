import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PutPayoutAccountDto } from './shop-payout.dto';

async function messages(body: unknown): Promise<string[]> {
  const errs = await validate(plainToInstance(PutPayoutAccountDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errs.flatMap((e) => Object.values(e.constraints ?? {}));
}

// Shape only; per-method rules are in ShopPayoutService.
describe('PutPayoutAccountDto', () => {
  it('accepts GCASH and BANK shapes', async () => {
    expect(await messages({ method: 'GCASH', accountName: 'A', accountNumber: '09171234567' })).toEqual([]);
    expect(
      await messages({ method: 'BANK', accountName: 'A', accountNumber: '1234567890', bankName: 'BPI' }),
    ).toEqual([]);
  });

  it('rejects an unknown method, a long name and extra fields', async () => {
    expect(await messages({ method: 'PAYPAL', accountName: 'A', accountNumber: '1' })).not.toEqual([]);
    expect(await messages({ method: 'BANK', accountName: 'x'.repeat(121), accountNumber: '123456', bankName: 'B' })).not.toEqual([]);
    expect(await messages({ method: 'GCASH', accountName: 'A', accountNumber: '09171234567', shopId: 'sB' })).not.toEqual([]);
  });

  it('never echoes the account number in a validation message', async () => {
    const n = '9'.repeat(41);
    const out = await messages({ method: 'BANK', accountName: 'A', accountNumber: n, bankName: 'B' });
    expect(out).not.toEqual([]);
    expect(out.join(' ')).not.toContain(n);
  });
});
