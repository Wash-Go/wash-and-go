import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminShopsService } from './admin-shops.service';
import type { PrismaService } from '../prisma/prisma.service';

// Hand-rolled Prisma stub — the service is a thin whitelist over Prisma
// (ADR-003), so the logic worth testing is shaping, guards, and conflicts.
function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    shop: {},
    shopService: {},
    shopMember: {},
    serviceCatalogItem: {},
    user: {},
    // $transaction runs the callback with the same stub as the tx client.
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    ...overrides,
  } as unknown as PrismaService;
  const notifications = { emit: jest.fn().mockResolvedValue(undefined) };
  return {
    svc: new AdminShopsService(prisma, notifications as never),
    prisma: prisma as never,
    notifications,
  };
}

const D = (n: number) => new Prisma.Decimal(n);

const rawShop = {
  id: 's1',
  name: 'Suds',
  address: 'Tetuan',
  lat: D(6.9),
  lng: D(122.07),
  active: true,
  status: 'VERIFIED',
  submittedAt: null,
  verifiedAt: new Date('2026-07-25T00:00:00Z'),
  rejectionReason: null,
  permitKey: null,
  photoKeys: [],
  commissionPct: D(12),
  expressSlotsPerDay: 3,
  createdAt: new Date('2026-07-25T00:00:00Z'),
};

describe('AdminShopsService', () => {
  it('create shapes decimals to strings, defaults counts to 0, and is VERIFIED (admin-trusted)', async () => {
    const create = jest.fn().mockResolvedValue(rawShop);
    const { svc } = makeService({ shop: { create } });
    const view = await svc.create({ name: 'Suds', address: 'Tetuan', lat: 6.9, lng: 122.07 });
    expect(view.commissionPct).toBe('12.00');
    expect(view.lat).toBe('6.9');
    expect(view.serviceCount).toBe(0);
    expect(view.memberCount).toBe(0);
    expect(view.status).toBe('VERIFIED');
    // admin-created shops skip onboarding straight to VERIFIED
    expect(create.mock.calls[0][0].data).toMatchObject({ status: 'VERIFIED' });
  });

  it('list shapes each shop with service + member counts', async () => {
    const { svc } = makeService({
      shop: {
        findMany: jest.fn().mockResolvedValue([
          { ...rawShop, _count: { services: 2, members: 3 } },
        ]),
      },
    });
    const [view] = await svc.list();
    expect(view).toMatchObject({ status: 'VERIFIED', serviceCount: 2, memberCount: 3 });
    expect(view.commissionPct).toBe('12.00');
  });

  it('get returns the shop with shaped services + members', async () => {
    const { svc } = makeService({
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          ...rawShop,
          services: [
            { id: 'ss1', serviceId: 'wdf', ratePhp: D(25), turnaroundHours: 24, active: true, service: { code: 'WDF', name: 'Wash & Fold' } },
          ],
          members: [
            { id: 'm1', userId: 'u1', role: 'OWNER', user: { displayName: 'Owner', phone: '+63917' } },
          ],
        }),
      },
    });
    const detail = await svc.get('s1');
    expect(detail.services).toHaveLength(1);
    expect(detail.services[0]).toMatchObject({ code: 'WDF', ratePhp: '25.00' });
    expect(detail.members[0]).toMatchObject({ role: 'OWNER', displayName: 'Owner' });
  });

  it('get 404s a missing shop', async () => {
    const { svc } = makeService({ shop: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(svc.get('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update applies partial fields and re-shapes', async () => {
    const update = jest.fn().mockResolvedValue({
      ...rawShop,
      expressSlotsPerDay: 9,
      _count: { services: 0, members: 0 },
    });
    const { svc } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }), update },
    });
    const view = await svc.update('s1', { expressSlotsPerDay: 9 });
    expect(view.expressSlotsPerDay).toBe(9);
    expect(update.mock.calls[0][0].data).toMatchObject({ expressSlotsPerDay: 9 });
  });

  it('update 404s a missing shop', async () => {
    const { svc } = makeService({ shop: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(svc.update('nope', { active: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('addService rejects an unknown catalog id', async () => {
    const { svc } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
      serviceCatalogItem: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      svc.addService('s1', { serviceId: 'nope', ratePhp: 100, turnaroundHours: 24 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('addService 409s when the shop already offers the service', async () => {
    const { svc } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
      serviceCatalogItem: { findUnique: jest.fn().mockResolvedValue({ id: 'wdf' }) },
      shopService: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }) },
    });
    await expect(
      svc.addService('s1', { serviceId: 'wdf', ratePhp: 100, turnaroundHours: 24 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updateService 404s when the service belongs to another shop', async () => {
    const { svc } = makeService({
      shopService: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ss1', shopId: 'OTHER', service: {} }),
      },
    });
    await expect(
      svc.updateService('s1', 'ss1', { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('addMember rejects an unknown user', async () => {
    const { svc } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      svc.addMember('s1', { userId: 'ghost', role: 'STAFF' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removeMember guards against deleting another shop’s member', async () => {
    const del = jest.fn();
    const { svc } = makeService({
      shopMember: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', shopId: 'OTHER' }),
        delete: del,
      },
    });
    await expect(svc.removeMember('s1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    expect(del).not.toHaveBeenCalled();
  });

  const verifiedRow = (status: string) => ({
    ...rawShop,
    status,
    _count: { services: 1, members: 1 },
  });

  it('verify rejects a shop that is not SUBMITTED', async () => {
    const { svc } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ status: 'VERIFIED' }) },
    });
    await expect(svc.verify('s1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('verify flips SUBMITTED → VERIFIED and notifies the owner', async () => {
    const { svc, notifications } = makeService({
      shop: {
        findUnique: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }),
        update: jest.fn().mockResolvedValue(verifiedRow('VERIFIED')),
      },
      shopMember: { findFirst: jest.fn().mockResolvedValue({ userId: 'owner1' }) },
    });
    const view = await svc.verify('s1');
    expect(view.status).toBe('VERIFIED');
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'owner1', type: 'SHOP_VERIFIED' }),
    );
  });

  it('reject sets REJECTED + reason and notifies the owner', async () => {
    const update = jest.fn().mockResolvedValue(verifiedRow('REJECTED'));
    const { svc, notifications } = makeService({
      shop: { findUnique: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }), update },
      shopMember: { findFirst: jest.fn().mockResolvedValue({ userId: 'owner1' }) },
    });
    await svc.reject('s1', 'blurry permit');
    expect(update.mock.calls[0][0].data).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'blurry permit',
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'SHOP_REJECTED', body: 'blurry permit' }),
    );
  });
});
