import { Injectable } from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

// Address-book persistence (simple domain; the service owns the one-default
// invariant and opens the transaction when a write touches sibling rows).
@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<Address | null> {
    return this.prisma.address.findUnique({ where: { id } });
  }

  // Clear the default flag on all of a user's addresses except (optionally) one.
  clearDefaults(tx: Tx, userId: string, exceptId?: string): Promise<Prisma.BatchPayload> {
    return tx.address.updateMany({
      where: { userId, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  create(tx: Tx, data: Prisma.AddressUncheckedCreateInput): Promise<Address> {
    return tx.address.create({ data });
  }

  update(tx: Tx, id: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return tx.address.update({ where: { id }, data });
  }

  delete(id: string): Promise<Address> {
    return this.prisma.address.delete({ where: { id } });
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
