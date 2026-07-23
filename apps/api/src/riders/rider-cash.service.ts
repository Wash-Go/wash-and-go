import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RiderCashRepository } from './rider-cash.repository';

export interface RiderCashBalance {
  riderId: string;
  collectedPhp: string; // COD taken from customers
  depositedPhp: string; // handed back to the platform
  outstandingPhp: string; // still owed to the platform (collected − deposited)
}

/*
 * Rider cash reconciliation (money model: platform intermediates). The rider
 * collects the full customerTotal COD, which belongs to the platform; this
 * tracks how much each rider still owes = collected − deposited. Ops records a
 * deposit when a rider hands cash back.
 */
@Injectable()
export class RiderCashService {
  constructor(private readonly repo: RiderCashRepository) {}

  async balance(riderId: string): Promise<RiderCashBalance> {
    const collected = await this.repo.sumCollected(riderId);
    const deposited = await this.repo.sumDeposited(riderId);
    return this.shape(riderId, collected, deposited);
  }

  // All riders who have collected any COD, with their outstanding balance.
  async summary(): Promise<RiderCashBalance[]> {
    const collected = await this.repo.collectedByRider();
    const deposited = await this.repo.depositedByRider();
    const depMap = new Map(deposited.map((d) => [d.riderId, d.total]));
    return collected
      .map((c) =>
        this.shape(c.riderId, c.total, depMap.get(c.riderId) ?? new Prisma.Decimal(0)),
      )
      .sort((a, b) => Number(b.outstandingPhp) - Number(a.outstandingPhp));
  }

  async recordDeposit(
    riderId: string,
    amount: number,
    actorUid: string,
    reference?: string,
    note?: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Deposit amount must be a positive number');
    }
    const rider = await this.repo.findRider(riderId);
    if (!rider) throw new NotFoundException('Rider not found');
    if (!rider.roles.includes('RIDER')) {
      throw new BadRequestException('User is not a rider');
    }
    return this.repo.createDeposit({
      riderId,
      amountPhp: new Prisma.Decimal(amount),
      reference,
      note,
      recordedByUid: actorUid,
    });
  }

  listDeposits(riderId: string) {
    return this.repo.listDeposits(riderId);
  }

  private shape(
    riderId: string,
    collected: Prisma.Decimal,
    deposited: Prisma.Decimal,
  ): RiderCashBalance {
    const outstanding = collected.sub(deposited);
    return {
      riderId,
      collectedPhp: collected.toFixed(2),
      depositedPhp: deposited.toFixed(2),
      outstandingPhp: outstanding.toFixed(2),
    };
  }
}
