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
    ...overrides,
  } as unknown as PrismaService;
  return { svc: new AdminShopsService(prisma), prisma: prisma as never };
}

const D = (n: number) => new Prisma.Decimal(n);

const rawShop = {
  id: 's1',
  name: 'Suds',
  address: 'Tetuan',
  lat: D(6.9),
  lng: D(122.07),
  active: true,
  commissionPct: D(12),
  expressSlotsPerDay: 3,
  createdAt: new Date('2026-07-25T00:00:00Z'),
};

describe('AdminShopsService', () => {
  it('create shapes decimals to strings and defaults counts to 0', async () => {
    const { svc } = makeService({
      shop: { create: jest.fn().mockResolvedValue(rawShop) },
    });
    const view = await svc.create({ name: 'Suds', address: 'Tetuan', lat: 6.9, lng: 122.07 });
    expect(view.commissionPct).toBe('12.00');
    expect(view.lat).toBe('6.9');
    expect(view.serviceCount).toBe(0);
    expect(view.memberCount).toBe(0);
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
});
