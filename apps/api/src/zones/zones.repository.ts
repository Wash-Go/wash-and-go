import { Injectable } from '@nestjs/common';
import { Prisma, Zone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(): Promise<Zone[]> {
    return this.prisma.zone.findMany({ where: { active: true } });
  }

  findAll(): Promise<Zone[]> {
    return this.prisma.zone.findMany({ orderBy: { createdAt: 'asc' } });
  }

  create(data: Prisma.ZoneUncheckedCreateInput): Promise<Zone> {
    return this.prisma.zone.create({ data });
  }

  setActive(id: string, active: boolean): Promise<Zone> {
    return this.prisma.zone.update({ where: { id }, data: { active } });
  }

  delete(id: string): Promise<Zone> {
    return this.prisma.zone.delete({ where: { id } });
  }
}
