import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
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
