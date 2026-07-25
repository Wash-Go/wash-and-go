import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopOnboardingService } from './shop-onboarding.service';
import type { PrismaService } from '../prisma/prisma.service';

const D = (n: number) => new Prisma.Decimal(n);

function make(overrides: Record<string, unknown> = {}) {
  const prisma = {
    shop: {},
    shopMember: {},
    user: {},
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    ...overrides,
  } as unknown as PrismaService;
  return { svc: new ShopOnboardingService(prisma), prisma: prisma as never };
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
  ...over,
});

describe('ShopOnboardingService', () => {
  it('mine returns null when the caller owns no shop', async () => {
    const { svc } = make({ shopMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    expect(await svc.mine(user)).toBeNull();
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
    const complete = draftShop({ name: 'Suds', address: 'Tetuan', lat: D(6.9), lng: D(122.08), permitKey: 'uploads/u1/permit.pdf' });
    const update = jest.fn().mockResolvedValue({ ...complete, status: 'SUBMITTED', submittedAt: new Date() });
    const { svc } = make({
      shopMember: { findFirst: jest.fn().mockResolvedValue({ shop: complete }) },
      shop: { update },
    });
    const view = await svc.submit(user);
    expect(view.status).toBe('SUBMITTED');
    expect(update.mock.calls[0][0].data).toMatchObject({ status: 'SUBMITTED' });
  });
});
