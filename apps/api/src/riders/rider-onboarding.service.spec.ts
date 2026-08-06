import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RiderOnboardingService } from './rider-onboarding.service';
import type { PrismaService } from '../prisma/prisma.service';

function make(overrides: Record<string, unknown> = {}) {
  const prisma = {
    riderProfile: {},
    user: {},
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    ...overrides,
  } as unknown as PrismaService;
  return { svc: new RiderOnboardingService(prisma) };
}

const user = { id: 'u1', roles: ['CUSTOMER'] } as never;

const draft = (over: Record<string, unknown> = {}) => ({
  id: 'rp1',
  userId: 'u1',
  status: 'DRAFT',
  rejectionReason: null,
  licenseKey: null,
  idKey: null,
  vehicleType: null,
  vehiclePlate: null,
  submittedAt: null,
  verifiedAt: null,
  ...over,
});

describe('RiderOnboardingService', () => {
  it('mine returns null when the caller has no profile', async () => {
    const { svc } = make({ riderProfile: { findUnique: jest.fn().mockResolvedValue(null) } });
    expect(await svc.mine(user)).toBeNull();
  });

  it('start creates a DRAFT profile + grants RIDER', async () => {
    const create = jest.fn().mockResolvedValue(draft());
    const userUpdate = jest.fn();
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue(null), create },
      user: { update: userUpdate },
    });
    const view = await svc.start(user);
    expect(view.status).toBe('DRAFT');
    expect(userUpdate.mock.calls[0][0].data.roles).toEqual(
      expect.arrayContaining(['CUSTOMER', 'RIDER']),
    );
  });

  it('start is idempotent', async () => {
    const create = jest.fn();
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue(draft({ status: 'SUBMITTED' })), create },
    });
    expect((await svc.start(user)).status).toBe('SUBMITTED');
    expect(create).not.toHaveBeenCalled();
  });

  it('update is blocked once SUBMITTED', async () => {
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue(draft({ status: 'SUBMITTED' })) },
    });
    await expect(svc.update(user, { vehicleType: 'e-bike' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('update throws when no profile exists', async () => {
    const { svc } = make({ riderProfile: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(svc.update(user, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('submit refuses an incomplete profile', async () => {
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue(draft()) },
    });
    await expect(svc.submit(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submit flips a complete profile to SUBMITTED', async () => {
    const complete = draft({
      licenseKey: 'uploads/u1/l.jpg', idKey: 'uploads/u1/id.jpg',
      vehicleType: 'e-bike', vehiclePlate: 'WG-9',
    });
    const update = jest.fn().mockResolvedValue({ ...complete, status: 'SUBMITTED', submittedAt: new Date() });
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue(complete), update },
    });
    expect((await svc.submit(user)).status).toBe('SUBMITTED');
  });
});
