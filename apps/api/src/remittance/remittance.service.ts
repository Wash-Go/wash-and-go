import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RemittanceBatch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RemittanceRepository } from './remittance.repository';

export interface ClosePeriod {
  periodStart: Date;
  periodEnd: Date; // exclusive
}

/*
 * Shop payout batching (PLAN §3.2). RemittanceLine rows are written per DELIVERED
 * order by OrdersService; this service groups the still-unbatched lines for a
 * period into one RemittanceBatch per shop (sum of payouts), then an ops user
 * marks a batch paid with the external transfer reference. Payout transfer is
 * external at launch — the batch tracks intent, not an automated bank transfer.
 *
 * Weekly automation (BullMQ repeatable) is deferred; today an admin triggers the
 * close. Realtime/notification emit is deferred until those modules land.
 */
@Injectable()
export class RemittanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RemittanceRepository,
  ) {}

  // Close one shop's unbatched lines in [periodStart, periodEnd) into a batch.
  // Returns null when there is nothing to batch (no double-empty batches).
  async closeBatch(
    shopId: string,
    period: ClosePeriod,
  ): Promise<RemittanceBatch | null> {
    this.assertPeriod(period);
    return this.prisma.$transaction((tx) =>
      this.closeBatchTx(tx, shopId, period),
    );
  }

  // Close every shop that has unbatched lines in the period — one batch each.
  async closeAllShops(period: ClosePeriod): Promise<RemittanceBatch[]> {
    this.assertPeriod(period);
    return this.prisma.$transaction(async (tx) => {
      const shopIds = await this.repo.distinctUnbatchedShops(
        tx,
        period.periodStart,
        period.periodEnd,
      );
      const batches: RemittanceBatch[] = [];
      for (const shopId of shopIds) {
        const b = await this.closeBatchTx(tx, shopId, period);
        if (b) batches.push(b);
      }
      return batches;
    });
  }

  private async closeBatchTx(
    tx: Prisma.TransactionClient,
    shopId: string,
    period: ClosePeriod,
  ): Promise<RemittanceBatch | null> {
    const lines = await this.repo.findUnbatchedLines(
      tx,
      shopId,
      period.periodStart,
      period.periodEnd,
    );
    if (lines.length === 0) return null;

    const total = lines.reduce(
      (acc, l) => acc.add(l.payoutPhp),
      new Prisma.Decimal(0),
    );

    const batch = await this.repo.createBatch(tx, {
      shopId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      totalPhp: total,
      lineCount: lines.length,
    });
    await this.repo.assignLinesToBatch(
      tx,
      lines.map((l) => l.id),
      batch.id,
    );
    return batch;
  }

  async listBatches(filter: {
    shopId?: string;
    status?: 'PENDING' | 'PAID';
  }): Promise<RemittanceBatch[]> {
    const where: Prisma.RemittanceBatchWhereInput = {};
    if (filter.shopId) where.shopId = filter.shopId;
    if (filter.status) where.status = filter.status;
    return this.repo.listBatches(where);
  }

  // Record the external payout transfer. Idempotent — a batch already PAID is
  // returned unchanged (re-submitting the same mark-paid is a no-op).
  async markPaid(
    batchId: string,
    reference: string,
    actorUid: string,
  ): Promise<RemittanceBatch> {
    const batch = await this.repo.findBatchById(batchId);
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status === 'PAID') return batch;
    return this.repo.markBatchPaid(batchId, { reference, paidByUid: actorUid });
  }

  private assertPeriod(period: ClosePeriod): void {
    if (period.periodEnd <= period.periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }
  }
}
