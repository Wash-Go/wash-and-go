import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Admin view of a rider application — profile + who it belongs to.
export interface RiderApplicationView {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  status: string;
  vehicleType: string | null;
  vehiclePlate: string | null;
  licenseKey: string | null;
  idKey: string | null;
  submittedAt: string | null;
}

/*
 * Admin rider verification (checkpoint D backend). Reviews SUBMITTED rider
 * profiles and moves them to VERIFIED (dispatchable) or REJECTED. Mirror of the
 * shop verify/reject flow.
 */
@Injectable()
export class AdminRidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listApplications(): Promise<RiderApplicationView[]> {
    const rows = await this.prisma.riderProfile.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { submittedAt: 'asc' },
      include: { user: true },
    });
    return rows.map((p) => this.shape(p));
  }

  async verify(id: string): Promise<RiderApplicationView> {
    const profile = await this.byId(id);
    if (profile.status !== 'SUBMITTED') {
      throw new ConflictException('Only a submitted rider can be verified');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.riderProfile.update({
        where: { id },
        data: { status: 'VERIFIED', verifiedAt: new Date(), rejectionReason: null },
        include: { user: true },
      });
      await this.notifications.emit(tx, {
        userId: p.userId,
        type: 'RIDER_VERIFIED',
        title: 'You’re verified',
        body: 'Your rider account is approved — you can now be assigned jobs.',
      });
      return p;
    });
    return this.shape(updated);
  }

  async reject(id: string, reason: string): Promise<RiderApplicationView> {
    const profile = await this.byId(id);
    if (profile.status !== 'SUBMITTED') {
      throw new ConflictException('Only a submitted rider can be rejected');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.riderProfile.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason },
        include: { user: true },
      });
      await this.notifications.emit(tx, {
        userId: p.userId,
        type: 'RIDER_REJECTED',
        title: 'Your rider application needs changes',
        body: reason,
      });
      return p;
    });
    return this.shape(updated);
  }

  private async byId(id: string) {
    const p = await this.prisma.riderProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Rider application not found');
    return p;
  }

  private shape(p: Prisma.RiderProfileGetPayload<{ include: { user: true } }>): RiderApplicationView {
    return {
      id: p.id,
      userId: p.userId,
      displayName: p.user.displayName,
      phone: p.user.phone,
      status: p.status,
      vehicleType: p.vehicleType,
      vehiclePlate: p.vehiclePlate,
      licenseKey: p.licenseKey,
      idKey: p.idKey,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
    };
  }
}
