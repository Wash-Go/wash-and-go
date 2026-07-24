import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RiderView {
  id: string;
  displayName: string;
  phone: string;
}

// Admin-only read for the assign-rider picker (ADR-003 direct-Prisma whitelist).
@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  listRiders(): Promise<RiderView[]> {
    return this.prisma.user.findMany({
      where: { roles: { has: UserRole.RIDER }, disabledAt: null },
      select: { id: true, displayName: true, phone: true },
      orderBy: { displayName: 'asc' },
    });
  }
}
