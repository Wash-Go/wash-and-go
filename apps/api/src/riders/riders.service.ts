import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { visiblePhone } from '../users/phone';

export interface RiderView {
  id: string;
  displayName: string;
  phone: string | null; // null = still the pending:<uid> placeholder
}

// Admin-only read for the assign-rider picker (ADR-003 direct-Prisma whitelist).
@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async listRiders(): Promise<RiderView[]> {
    const rows = await this.prisma.user.findMany({
      // Only VERIFIED riders are assignable — an unverified (onboarding) rider
      // never appears in the dispatch picker.
      where: {
        roles: { has: UserRole.RIDER },
        disabledAt: null,
        riderProfile: { status: 'VERIFIED' },
      },
      select: { id: true, displayName: true, phone: true },
      orderBy: { displayName: 'asc' },
    });
    return rows.map((r) => ({ ...r, phone: visiblePhone(r.phone) }));
  }
}
