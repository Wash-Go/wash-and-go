import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopOnboardingService } from './shop-onboarding.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { UploadsService } from '../uploads/uploads.service';

const D = (n: number) => new Prisma.Decimal(n);

function make(overrides: Record<string, unknown> = {}, opts: { r2?: boolean } = {}) {
  const prisma = {
    shop: {},
    shopMember: {},
    shopService: { count: jest.fn().mockResolvedValue(1) },
    user: {},
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    ...overrides,
  } as unknown as PrismaService;
  const uploads = { configured: () => opts.r2 ?? true } as unknown as UploadsService;
  return { svc: new ShopOnboardingService(prisma, uploads), prisma: prisma as never };
}

const user = { id: 'u1', roles: ['CUSTOMER'] } as never;

const draftShop = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  name: 'My laundry',
  address: '',
  lat: D(0),
  lng: D(0),
  status: 'DRAFT',
  rejectionReason: null,
  permitKey: null,
  photoKeys: [],
  submittedAt: null,
  verifiedAt: null,
  contactPhone: null,
  description: null,
  hours: null,
  expressSlotsPerDay: 0,
  ...over,
});

const completeShop = (over: Record<string, unknown> = {}) =>
  draftShop({
    name: 'Suds',
    address: 'Tetuan',
    lat: D(6.9),
    lng: D(122.08),
    contactPhone: '+639171234567',
    permitKey: 'uploads/u1/permit.pdf',
    ...over,
  });

const week = (over: Record<number, unknown> = {}) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => over[day] ?? { day, open: '08:00', close: '18:00' });

// The 400 body message — the wizard maps each label to its step.
async function missingOf(p: Promise<unknown>): Promise<string> {
  const e = await p.then(
    () => {
      throw new Error('expected a 400');
    },
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(BadRequestException);
  return (e as BadRequestException).message;
}

describe('ShopOnboardingService', () => {
  it('mine returns null when the caller owns no shop', async () => {
    const { svc } = make({ shopMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    expect(await svc.mine(user)).toBeNull();
  });

  it('ownedShop pins the lookup: OWNER rows only, lowest member id on a tie', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const { svc } = make({ shopMember: { findFirst } });
    await svc.mine(user);
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', role: 'OWNER' },
      orderBy: [{ role: 'asc' }, { id: 'asc' }],
      include: { shop: true },
    });
  });

  it('start creates a DRAFT shop + OWNER member + grants SHOP_OWNER', async () => {
    const shopCreate = jest.fn().mockResolvedValue(draftShop());
    const memberCreate = jest.fn();
    const userUpdate = jest.fn();
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue(null), create: memberCreate },
      shop: { create: shopCreate },
      user: { update: userUpdate },
    });
    const view = await svc.start(user);
    expect(view.status).toBe('DRAFT');
    expect(memberCreate).toHaveBeenCalledWith({ data: { shopId: 's1', userId: 'u1', role: 'OWNER' } });
    expect(userUpdate.mock.calls[0][0].data.roles).toEqual(
      expect.arrayContaining(['CUSTOMER', 'SHOP_OWNER']),
    );
  });

  it('start is idempotent — returns the existing owned shop', async () => {
    const create = jest.fn();
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: draftShop({ status: 'SUBMITTED' }) }) },
      shop: { create },
    });
    const view = await svc.start(user);
    expect(view.status).toBe('SUBMITTED');
    expect(create).not.toHaveBeenCalled();
  });

  it('update is blocked once SUBMITTED', async () => {
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: draftShop({ status: 'SUBMITTED' }) }) },
    });
    await expect(svc.update(user, { name: 'X' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('update throws when the caller has no shop', async () => {
    const { svc } = make({ shopMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(svc.update(user, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('submit refuses an incomplete draft and lists what is missing', async () => {
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: draftShop() }) },
    });
    await expect(svc.submit(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submit flips a complete draft to SUBMITTED', async () => {
    const complete = completeShop();
    const update = jest.fn().mockResolvedValue({ ...complete, status: 'SUBMITTED', submittedAt: new Date() });
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: complete }) },
      shop: { update },
    });
    const view = await svc.submit(user);
    expect(view.status).toBe('SUBMITTED');
    expect(update.mock.calls[0][0].data).toMatchObject({ status: 'SUBMITTED' });
  });

  describe('wizard fields (B3)', () => {
    function editable(shop = draftShop()) {
      const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...shop, ...data }));
      const ctx = make({
        shopMember: { findFirst: jest.fn().mockResolvedValue({ shop }) },
        shop: { update },
      });
      return { ...ctx, update };
    }

    it('mine returns the wizard fields', async () => {
      const shop = draftShop({
        contactPhone: '+639171234567',
        description: 'Fresh folds',
        hours: week(),
        expressSlotsPerDay: 6,
      });
      const { svc } = make({ shopMember: { findFirst: jest.fn().mockResolvedValue({ shop }) } });
      expect(await svc.mine(user)).toMatchObject({
        contactPhone: '+639171234567',
        description: 'Fresh folds',
        hours: week(),
        expressSlotsPerDay: 6,
        documentsPending: false,
      });
    });

    it('update normalizes and persists the contact phone', async () => {
      const { svc, update } = editable();
      const view = await svc.update(user, { contactPhone: '0917-123-4567' });
      expect(update.mock.calls[0][0].data.contactPhone).toBe('+639171234567');
      expect(view.contactPhone).toBe('+639171234567');
    });

    it('update rejects a non-PH-mobile contact phone', async () => {
      const { svc, update } = editable();
      await expect(svc.update(user, { contactPhone: '02 8123 4567' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('update persists description, slots and hours (sorted by day, no extras)', async () => {
      const { svc, update } = editable();
      const shuffled = [...week({ 0: { day: 0, open: null, close: null } })].reverse();
      await svc.update(user, { description: 'Fresh folds', expressSlotsPerDay: 12, hours: shuffled as never });
      const data = update.mock.calls[0][0].data;
      expect(data.description).toBe('Fresh folds');
      expect(data.expressSlotsPerDay).toBe(12);
      expect(data.hours).toEqual(week({ 0: { day: 0, open: null, close: null } }));
    });

    it('update clears a blank description', async () => {
      const { svc, update } = editable(draftShop({ description: 'old' }));
      await svc.update(user, { description: '   ' });
      expect(update.mock.calls[0][0].data.description).toBeNull();
    });

    it.each([
      ['open after close', week({ 2: { day: 2, open: '18:00', close: '08:00' } })],
      ['open equal to close', week({ 2: { day: 2, open: '09:00', close: '09:00' } })],
      ['only open set', week({ 2: { day: 2, open: '09:00', close: null } })],
      ['only close set', week({ 2: { day: 2, open: null, close: '17:00' } })],
      ['a duplicated day', week({ 2: { day: 3, open: '08:00', close: '18:00' } })],
    ])('update rejects hours with %s', async (_label, hours) => {
      const { svc, update } = editable();
      await expect(svc.update(user, { hours: hours as never })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('update of wizard fields is locked once VERIFIED', async () => {
      const { svc } = editable(draftShop({ status: 'VERIFIED' }));
      await expect(svc.update(user, { expressSlotsPerDay: 3 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('update of wizard fields is allowed on a REJECTED shop', async () => {
      const { svc, update } = editable(draftShop({ status: 'REJECTED' }));
      await svc.update(user, { description: 'Fixed' });
      expect(update).toHaveBeenCalled();
    });
  });

  describe('submit rule (B3)', () => {
    function submitting(shop: ReturnType<typeof draftShop>, opts: { r2?: boolean; services?: number } = {}) {
      const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...shop, ...data }));
      const count = jest.fn().mockResolvedValue(opts.services ?? 1);
      const ctx = make(
        {
          shopMember: { findFirst: jest.fn().mockResolvedValue({ shop }) },
          shop: { update },
          shopService: { count },
        },
        { r2: opts.r2 },
      );
      return { ...ctx, update, count };
    }

    it('lists every missing field for an empty draft (R2 configured)', async () => {
      const { svc } = submitting(draftShop(), { services: 0 });
      expect(await missingOf(svc.submit(user))).toBe(
        'Please add: shop name, address, map location, contact phone, services, business permit',
      );
    });

    it('requires a contact phone', async () => {
      const { svc } = submitting(completeShop({ contactPhone: null }));
      expect(await missingOf(svc.submit(user))).toBe('Please add: contact phone');
    });

    it('requires at least one ACTIVE service', async () => {
      const { svc, count } = submitting(completeShop(), { services: 0 });
      expect(await missingOf(svc.submit(user))).toBe('Please add: services');
      expect(count).toHaveBeenCalledWith({ where: { shopId: 's1', active: true } });
    });

    it('requires the permit when R2 is configured', async () => {
      const { svc } = submitting(completeShop({ permitKey: null }), { r2: true });
      expect(await missingOf(svc.submit(user))).toBe('Please add: business permit');
    });

    it('submits without a permit when R2 is not configured, flagging documentsPending', async () => {
      const { svc, update } = submitting(completeShop({ permitKey: null }), { r2: false });
      const view = await svc.submit(user);
      expect(view.status).toBe('SUBMITTED');
      expect(view.documentsPending).toBe(true);
      expect(update.mock.calls[0][0].data).toMatchObject({ status: 'SUBMITTED' });
    });

    it('a submission with a permit is not documentsPending', async () => {
      const { svc } = submitting(completeShop(), { r2: false });
      expect((await svc.submit(user)).documentsPending).toBe(false);
    });

    it('documentsPending is derived: true only for SUBMITTED/VERIFIED without a permit', async () => {
      const cases: Array<[string, string | null, boolean]> = [
        ['DRAFT', null, false],
        ['REJECTED', null, false],
        ['SUBMITTED', null, true],
        ['VERIFIED', null, true],
        ['VERIFIED', 'uploads/u1/p.pdf', false],
      ];
      for (const [status, permitKey, pending] of cases) {
        const { svc } = make({
          shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: draftShop({ status, permitKey }) }) },
        });
        expect((await svc.mine(user))?.documentsPending).toBe(pending);
      }
    });
  });
});
