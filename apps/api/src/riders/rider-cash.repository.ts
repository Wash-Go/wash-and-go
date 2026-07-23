import { Injectable } from '@nestjs/common';
import { Prisma, RiderCashDeposit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/*
 * Money-domain repo (ADR-003). Reads the COD a rider collected (paid-cash orders
 * assigned to them) and the deposits they've handed back; the service computes
 * the outstanding balance from the two.
 */
@Injectable()
export class RiderCashRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Total customer cash a rider collected = SUM(customerTotalPhp) over their
  // paid-cash orders. (paidCashAt set ⇒ the rider took COD at delivery.)
  async sumCollected(riderId: string): Promise<Prisma.Decimal> {
    const r = await this.prisma.order.aggregate({
      _sum: { customerTotalPhp: true },
      where: { assignedRiderId: riderId, paidCashAt: { not: null } },
    });
    return r._sum.customerTotalPhp ?? new Prisma.Decimal(0);
  }

  async sumDeposited(riderId: string): Promise<Prisma.Decimal> {
    const r = await this.prisma.riderCashDeposit.aggregate({
      _sum: { amountPhp: true },
      where: { riderId },
    });
    return r._sum.amountPhp ?? new Prisma.Decimal(0);
  }

  // Per-rider collected totals (for the ops summary), riders who took any COD.
  async collectedByRider(): Promise<{ riderId: string; total: Prisma.Decimal }[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['assignedRiderId'],
      _sum: { customerTotalPhp: true },
      where: { assignedRiderId: { not: null }, paidCashAt: { not: null } },
    });
    return rows
      .filter((r) => r.assignedRiderId)
      .map((r) => ({
        riderId: r.assignedRiderId as string,
        total: r._sum.customerTotalPhp ?? new Prisma.Decimal(0),
      }));
  }

  async depositedByRider(): Promise<{ riderId: string; total: Prisma.Decimal }[]> {
    const rows = await this.prisma.riderCashDeposit.groupBy({
      by: ['riderId'],
      _sum: { amountPhp: true },
    });
    return rows.map((r) => ({
      riderId: r.riderId,
      total: r._sum.amountPhp ?? new Prisma.Decimal(0),
    }));
  }

  createDeposit(
    data: Prisma.RiderCashDepositUncheckedCreateInput,
  ): Promise<RiderCashDeposit> {
    return this.prisma.riderCashDeposit.create({ data });
  }

  listDeposits(riderId: string): Promise<RiderCashDeposit[]> {
    return this.prisma.riderCashDeposit.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  findRider(riderId: string) {
    return this.prisma.user.findUnique({ where: { id: riderId } });
  }
}
