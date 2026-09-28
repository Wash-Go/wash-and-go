import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminRidersService } from './admin-riders.service';
import type { PrismaService } from '../prisma/prisma.service';

function make(overrides: Record<string, unknown> = {}) {
  const prisma = {
    riderProfile: {},
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    ...overrides,
  } as unknown as PrismaService;
  const notifications = { emit: jest.fn().mockResolvedValue(undefined) };
  return { svc: new AdminRidersService(prisma, notifications as never), notifications };
}

const withUser = (status: string) => ({
  id: 'rp1',
  userId: 'u1',
  status,
  vehicleType: 'e-bike',
  vehiclePlate: 'WG-9',
  licenseKey: 'uploads/u1/l.jpg',
  idKey: 'uploads/u1/id.jpg',
  submittedAt: new Date(),
  user: { displayName: 'Rider One', phone: '+63917' },
});

describe('AdminRidersService', () => {
  it('verify rejects a non-SUBMITTED rider', async () => {
    const { svc } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue({ status: 'VERIFIED' }) },
    });
    await expect(svc.verify('rp1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('verify 404s an unknown rider', async () => {
    const { svc } = make({ riderProfile: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(svc.verify('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('verify flips SUBMITTED → VERIFIED and notifies the rider', async () => {
    const { svc, notifications } = make({
      riderProfile: {
        findUnique: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }),
        update: jest.fn().mockResolvedValue(withUser('VERIFIED')),
      },
    });
    const view = await svc.verify('rp1');
    expect(view.status).toBe('VERIFIED');
    expect(view.displayName).toBe('Rider One');
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'u1', type: 'RIDER_VERIFIED' }),
    );
  });

  it('reject sets REJECTED + reason and notifies', async () => {
    const update = jest.fn().mockResolvedValue(withUser('REJECTED'));
    const { svc, notifications } = make({
      riderProfile: { findUnique: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }), update },
    });
    await svc.reject('rp1', 'blurry license');
    expect(update.mock.calls[0][0].data).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'blurry license',
    });
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'RIDER_REJECTED', body: 'blurry license' }),
    );
  });
});
