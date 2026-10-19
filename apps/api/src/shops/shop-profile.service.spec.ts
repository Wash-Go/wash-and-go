import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopAccessService } from './shop-access.service';
import { ShopProfileService } from './shop-profile.service';
import { fakeShopPrisma } from './testing/shop-prisma.fake';

const D = (n: number) => new Prisma.Decimal(n);

const shop = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Shop ${id}`,
  address: 'Tetuan',
  lat: D(6.9),
  lng: D(122.08),
  status: 'VERIFIED',
  verifiedAt: new Date('2026-10-01T00:00:00Z'),
  contactPhone: '+639171234567',
  description: null,
  hours: null,
  expressSlotsPerDay: 5,
  payoutMethod: null,
  payoutAccountName: null,
  payoutAccountNumber: null,
  payoutBankName: null,
  payoutUpdatedAt: null,
  ...over,
});

const week = (over: Record<number, unknown> = {}) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => over[day] ?? { day, open: '08:00', close: '18:00' });

function setup() {
  const fake = fakeShopPrisma({
    shop: [
      shop('sA', {
        payoutMethod: 'BANK',
        payoutAccountName: 'Ana Reyes',
        payoutAccountNumber: '001234567890',
        payoutBankName: 'BPI',
        payoutUpdatedAt: new Date('2026-10-02T00:00:00Z'),
      }),
      shop('sB'),
      shop('sD', { status: 'DRAFT', verifiedAt: null }),
      shop('sP', { status: 'SUBMITTED', verifiedAt: null }),
      shop('sR', { status: 'REJECTED', verifiedAt: null }),
    ],
    shopMember: [
      { id: 'mA', shopId: 'sA', userId: 'uA', role: 'OWNER' },
      { id: 'mS', shopId: 'sA', userId: 'uS', role: 'STAFF' },
      { id: 'mB', shopId: 'sB', userId: 'uB', role: 'OWNER' },
      { id: 'mD', shopId: 'sD', userId: 'uD', role: 'OWNER' },
      { id: 'mP', shopId: 'sP', userId: 'uP', role: 'OWNER' },
      { id: 'mR', shopId: 'sR', userId: 'uR', role: 'OWNER' },
    ],
  });
  const svc = new ShopProfileService(fake.prisma, new ShopAccessService(fake.prisma));
  return { svc, tables: fake.tables };
}

describe('ShopProfileService', () => {
  describe('GET /shop/me', () => {
    it('returns the caller’s shop profile with a masked payout account and myRole', async () => {
      const { svc } = setup();
      const view = await svc.get('uA');
      expect(view).toEqual({
        id: 'sA',
        name: 'Shop sA',
        address: 'Tetuan',
        lat: '6.9',
        lng: '122.08',
        contactPhone: '+639171234567',
        description: null,
        hours: null,
        expressSlotsPerDay: 5,
        status: 'VERIFIED',
        verifiedAt: '2026-10-01T00:00:00.000Z',
        payoutAccount: {
          method: 'BANK',
          accountName: 'Ana Reyes',
          accountNumberMasked: '•••• 7890',
          bankName: 'BPI',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
        myRole: 'OWNER',
      });
      expect(JSON.stringify(view)).not.toContain('001234567890');
    });

    it('staff can read it (myRole STAFF), still masked', async () => {
      const { svc } = setup();
      const view = await svc.get('uS');
      expect(view.id).toBe('sA');
      expect(view.myRole).toBe('STAFF');
      expect(JSON.stringify(view)).not.toContain('001234567890');
    });

    it('payoutAccount is null when none is set', async () => {
      const { svc } = setup();
      expect((await svc.get('uB')).payoutAccount).toBeNull();
    });

    it('a user with no shop gets 404', async () => {
      const { svc } = setup();
      await expect(svc.get('nobody')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('owner B only ever sees shop B', async () => {
      const { svc } = setup();
      expect((await svc.get('uB')).id).toBe('sB');
    });
  });

  describe('PATCH /shop/me', () => {
    it('owner edits profile, hours and capacity on a VERIFIED shop', async () => {
      const { svc, tables } = setup();
      const shuffled = [...week({ 0: { day: 0, open: null, close: null } })].reverse();
      const view = await svc.update('uA', {
        name: 'Suds Tetuan',
        contactPhone: '0918 765 4321',
        description: '  Same-day fold  ',
        hours: shuffled as never,
        expressSlotsPerDay: 9,
        lat: 6.91,
        lng: 122.07,
      });
      const row = tables.shop.find((s) => s.id === 'sA')!;
      expect(row).toMatchObject({
        name: 'Suds Tetuan',
        contactPhone: '+639187654321',
        description: 'Same-day fold',
        expressSlotsPerDay: 9,
      });
      expect(row.hours).toEqual(week({ 0: { day: 0, open: null, close: null } }));
      expect(view.expressSlotsPerDay).toBe(9);
      expect(view.lat).toBe('6.91');
    });

    it('only touches the caller’s shop — shop B is unchanged', async () => {
      const { svc, tables } = setup();
      await svc.update('uA', { name: 'Renamed' });
      expect(tables.shop.find((s) => s.id === 'sB')!.name).toBe('Shop sB');
    });

    it('a REJECTED shop may be edited here too', async () => {
      const { svc } = setup();
      expect((await svc.update('uR', { description: 'x' })).description).toBe('x');
    });

    it.each([
      ['DRAFT', 'uD'],
      ['SUBMITTED', 'uP'],
    ])('%s shop → 409 pointing at the onboarding route', async (_s, uid) => {
      const { svc, tables } = setup();
      const before = JSON.stringify(tables.shop);
      const err = await svc.update(uid, { name: 'X' }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as Error).message).toContain('/shop/onboarding');
      expect(JSON.stringify(tables.shop)).toBe(before);
    });

    it('staff cannot edit (403)', async () => {
      const { svc, tables } = setup();
      await expect(svc.update('uS', { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(tables.shop.find((s) => s.id === 'sA')!.name).toBe('Shop sA');
    });

    it('no shop → 404', async () => {
      const { svc } = setup();
      await expect(svc.update('nobody', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a non-PH-mobile contact phone and bad hours (shared rules)', async () => {
      const { svc } = setup();
      await expect(svc.update('uA', { contactPhone: '12345' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        svc.update('uA', {
          hours: week({
            3: { day: 3, open: '19:00', close: '07:00' },
          }) as never,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
