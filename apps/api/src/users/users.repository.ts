import { Injectable } from '@nestjs/common';
import type { Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/*
 * The only place `users` persistence touches Prisma (ADR-003 repository seam,
 * introduced early on a simple domain per debate D2). Services depend on this
 * interface, so auth logic unit-tests with a mocked repo and zero database.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { firebaseUid } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Admin user directory: optional role filter + free-text (phone/name) search.
  listUsers(filter: { role?: UserRole; q?: string }, take = 100): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};
    if (filter.role) where.roles = { has: filter.role };
    if (filter.q) {
      where.OR = [
        { phone: { contains: filter.q, mode: 'insensitive' } },
        { displayName: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 200),
    });
  }

  updateRoles(id: string, roles: UserRole[]): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { roles } });
  }

  setDisabledAt(id: string, disabledAt: Date | null): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { disabledAt } });
  }

  upsertByFirebaseUid(input: {
    firebaseUid: string;
    phone?: string;
  }): Promise<User> {
    // Phone is required by the schema; on first sign-in Firebase supplies it.
    // Fall back to the uid-derived placeholder only if a phone is somehow absent
    // (keeps the unique constraint satisfiable; corrected on the next verified login).
    const phone = input.phone ?? `pending:${input.firebaseUid}`;
    const data: Prisma.UserCreateInput = {
      firebaseUid: input.firebaseUid,
      phone,
      displayName: '',
      roles: ['CUSTOMER'],
    };
    return this.prisma.user.upsert({
      where: { firebaseUid: input.firebaseUid },
      create: data,
      update: { phone },
    });
  }
}
