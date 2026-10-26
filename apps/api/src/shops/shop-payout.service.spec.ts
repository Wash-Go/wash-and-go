import { BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { ShopAccessService } from './shop-access.service';
import { ShopPayoutService } from './shop-payout.service';
import { fakeShopPrisma } from './testing/shop-prisma.fake';

const empty = {
  payoutMethod: null,
  payoutAccountName: null,
  payoutAccountNumber: null,
  payoutBankName: null,
  payoutUpdatedAt: null,
};

function setup() {
  const fake = fakeShopPrisma({
    shop: [
      { id: 'sA', status: 'VERIFIED', ...empty },
      {
        id: 'sB',
        status: 'VERIFIED',
        payoutMethod: 'GCASH',
        payoutAccountName: 'Ben Cruz',
        payoutAccountNumber: '+639175550001',
        payoutBankName: null,
        payoutUpdatedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ],
    shopMember: [
      { id: 'mA', shopId: 'sA', userId: 'uA', role: 'OWNER' },
      { id: 'mS', shopId: 'sA', userId: 'uS', role: 'STAFF' },
      { id: 'mB', shopId: 'sB', userId: 'uB', role: 'OWNER' },
    ],
  });
  const svc = new ShopPayoutService(fake.prisma, new ShopAccessService(fake.prisma));
  const row = (id: string) => fake.tables.shop.find((s) => s.id === id)!;
  return { svc, row };
}

// The full number must never appear in a response OR an error body.
async function bodyOf(p: Promise<unknown>): Promise<string> {
  return p.then(
    (v) => JSON.stringify(v),
    (e: unknown) =>
      JSON.stringify((e as { getResponse?: () => unknown }).getResponse?.() ?? String(e)),
  );
}

describe('ShopPayoutService', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  describe('PUT /shop/payout-account', () => {
    it('GCASH: normalizes the mobile number, stores it in full, returns it masked', async () => {
      const { svc, row } = setup();
      const view = await svc.put('uA', {
        method: 'GCASH',
        accountName: '  Ana Reyes ',
        accountNumber: '0917-123-4567',
      });
      expect(view).toEqual({
        method: 'GCASH',
        accountName: 'Ana Reyes',
        accountNumberMasked: '•••• 4567',
        bankName: null,
        updatedAt: expect.any(String),
      });
      expect(JSON.stringify(view)).not.toContain('9171234567');
      expect(row('sA')).toMatchObject({
        payoutMethod: 'GCASH',
        payoutAccountName: 'Ana Reyes',
        payoutAccountNumber: '+639171234567',
        payoutBankName: null,
      });
      expect(row('sA').payoutUpdatedAt).toBeInstanceOf(Date);
    });

    it('BANK: strips spaces/dashes, requires a bank name, returns masked', async () => {
      const { svc, row } = setup();
      const view = await svc.put('uA', {
        method: 'BANK',
        accountName: 'Ana Reyes',
        accountNumber: '0012 3456 7890',
        bankName: ' BPI ',
      });
      expect(view).toMatchObject({
        method: 'BANK',
        accountNumberMasked: '•••• 7890',
        bankName: 'BPI',
      });
      expect(row('sA').payoutAccountNumber).toBe('001234567890');
    });

    it('switching BANK → GCASH clears the bank name', async () => {
      const { svc, row } = setup();
      await svc.put('uA', {
        method: 'BANK',
        accountName: 'A',
        accountNumber: '123456',
        bankName: 'BDO',
      });
      await svc.put('uA', {
        method: 'GCASH',
        accountName: 'A',
        accountNumber: '09171234567',
      });
      expect(row('sA').payoutBankName).toBeNull();
    });

    it.each([
      ['GCASH with a landline', { method: 'GCASH', accountName: 'A', accountNumber: '0288123456' }],
      [
        'GCASH with a bank name',
        {
          method: 'GCASH',
          accountName: 'A',
          accountNumber: '09171234567',
          bankName: 'BPI',
        },
      ],
      [
        'BANK without a bank name',
        { method: 'BANK', accountName: 'A', accountNumber: '1234567890' },
      ],
      [
        'BANK with a blank bank name',
        {
          method: 'BANK',
          accountName: 'A',
          accountNumber: '1234567890',
          bankName: '  ',
        },
      ],
      [
        'BANK with 5 digits',
        {
          method: 'BANK',
          accountName: 'A',
          accountNumber: '12345',
          bankName: 'BPI',
        },
      ],
      [
        'BANK with 21 digits',
        {
          method: 'BANK',
          accountName: 'A',
          accountNumber: '1'.repeat(21),
          bankName: 'BPI',
        },
      ],
      [
        'BANK with letters',
        {
          method: 'BANK',
          accountName: 'A',
          accountNumber: '12345AB890',
          bankName: 'BPI',
        },
      ],
      [
        'a blank account name',
        {
          method: 'BANK',
          accountName: '   ',
          accountNumber: '1234567890',
          bankName: 'BPI',
        },
      ],
    ])('rejects %s (400, nothing written, number not echoed)', async (_label, dto) => {
      const { svc, row } = setup();
      const err = await svc.put('uA', dto as never).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      const body = JSON.stringify((err as BadRequestException).getResponse());
      expect(body).not.toContain(dto.accountNumber);
      expect(row('sA')).toMatchObject(empty);
    });

    it('logs an audit line without the number', async () => {
      const { svc } = setup();
      await svc.put('uA', {
        method: 'GCASH',
        accountName: 'A',
        accountNumber: '09171234567',
      });
      expect(log).toHaveBeenCalledWith({
        event: 'shop.payout_account.updated',
        shopId: 'sA',
        userId: 'uA',
        method: 'GCASH',
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/9171234567/);
    });

    it('staff → 403, nothing written', async () => {
      const { svc, row } = setup();
      const body = await bodyOf(
        svc.put('uS', {
          method: 'GCASH',
          accountName: 'A',
          accountNumber: '09171234567',
        }),
      );
      expect(body).toContain('owner');
      expect(body).not.toContain('9171234567');
      expect(row('sA')).toMatchObject(empty);
    });

    it('no shop → 404', async () => {
      const { svc } = setup();
      await expect(
        svc.put('nobody', {
          method: 'GCASH',
          accountName: 'A',
          accountNumber: '09171234567',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('owner A writes only shop A — shop B keeps its account', async () => {
      const { svc, row } = setup();
      await svc.put('uA', {
        method: 'GCASH',
        accountName: 'A',
        accountNumber: '09171234567',
      });
      expect(row('sB').payoutAccountNumber).toBe('+639175550001');
    });
  });

  describe('DELETE /shop/payout-account', () => {
    it('clears all five columns on the caller’s shop only', async () => {
      const { svc, row } = setup();
      await svc.put('uA', {
        method: 'BANK',
        accountName: 'A',
        accountNumber: '123456',
        bankName: 'BDO',
      });
      await svc.remove('uA');
      expect(row('sA')).toMatchObject(empty);
      expect(row('sB').payoutAccountNumber).toBe('+639175550001');
    });

    it('logs the removal', async () => {
      const { svc } = setup();
      await svc.remove('uB');
      expect(log).toHaveBeenCalledWith({
        event: 'shop.payout_account.removed',
        shopId: 'sB',
        userId: 'uB',
      });
    });

    it('staff → 403, no-shop → 404', async () => {
      const { svc, row } = setup();
      await expect(svc.remove('uS')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.remove('nobody')).rejects.toBeInstanceOf(NotFoundException);
      expect(row('sB').payoutAccountNumber).toBe('+639175550001');
    });
  });
});
