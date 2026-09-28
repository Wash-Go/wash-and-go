import { Injectable, NotFoundException } from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { AddressRepository } from './address.repository';

export interface AddressInput {
  label?: string;
  line: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

/*
 * Customer address book. Every operation is scoped to the owning user — a
 * missing OR not-owned id is a 404 (never leak that another user's address
 * exists). Invariant: at most one default per user, enforced in the same
 * transaction as the write that sets it.
 */
@Injectable()
export class AddressService {
  constructor(private readonly repo: AddressRepository) {}

  list(userId: string): Promise<Address[]> {
    return this.repo.findByUser(userId);
  }

  async create(userId: string, input: AddressInput): Promise<Address> {
    return this.repo.transaction(async (tx) => {
      if (input.isDefault) await this.repo.clearDefaults(tx, userId);
      return this.repo.create(tx, {
        userId,
        label: input.label,
        line: input.line,
        lat: input.lat != null ? new Prisma.Decimal(input.lat) : null,
        lng: input.lng != null ? new Prisma.Decimal(input.lng) : null,
        isDefault: input.isDefault ?? false,
      });
    });
  }

  async update(
    userId: string,
    id: string,
    input: Partial<AddressInput>,
  ): Promise<Address> {
    await this.assertOwned(userId, id);
    return this.repo.transaction(async (tx) => {
      if (input.isDefault === true) await this.repo.clearDefaults(tx, userId, id);
      const data: Prisma.AddressUpdateInput = {};
      if (input.label !== undefined) data.label = input.label;
      if (input.line !== undefined) data.line = input.line;
      if (input.lat !== undefined) {
        data.lat = input.lat != null ? new Prisma.Decimal(input.lat) : null;
      }
      if (input.lng !== undefined) {
        data.lng = input.lng != null ? new Prisma.Decimal(input.lng) : null;
      }
      if (input.isDefault !== undefined) data.isDefault = input.isDefault;
      return this.repo.update(tx, id, data);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);
    await this.repo.delete(id);
  }

  private async assertOwned(userId: string, id: string): Promise<Address> {
    const addr = await this.repo.findById(id);
    if (!addr || addr.userId !== userId) {
      throw new NotFoundException('Address not found');
    }
    return addr;
  }
}
