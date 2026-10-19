import { Injectable } from '@nestjs/common';
import type { Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { placeholderPhone } from './phone';

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

  // PATCH /auth/me — the user's own name / mobile number. A mobile number that
  // another account already has fails the unique index (P2002); the service
  // maps that to a 409.
  updateProfile(
    id: string,
    data: { displayName?: string; phone?: string },
  ): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  // POST /auth/session. Creates the user on first sign-in; afterwards it only
  // returns the row. It runs on every app load / restore (U0 T1), so the update
  // branch must never touch the name or mobile number the user saved with
  // PATCH /auth/me (it used to rewrite phone to the placeholder on every call),
  // nor roles an admin granted.
  upsertByFirebaseUid(input: {
    firebaseUid: string;
    phone?: string;
  }): Promise<User> {
    // Phone is required and unique. A phone-auth token supplies a verified
    // number; an email sign-up has none, so it gets the uid-derived placeholder
    // until the user adds a real number (PATCH /auth/me).
    const data: Prisma.UserCreateInput = {
      firebaseUid: input.firebaseUid,
      phone: input.phone ?? placeholderPhone(input.firebaseUid),
      displayName: '',
      roles: ['CUSTOMER'],
    };
    return this.prisma.user.upsert({
      where: { firebaseUid: input.firebaseUid },
      create: data,
      // A no-op write, NOT `{}`: an empty update makes Prisma fall back to
      // SELECT-then-INSERT, and two first sessions in parallel (the customer
      // login screen and its root layout both call this) then lose a P2002
      // race. Re-setting the conflict key keeps it one atomic
      // INSERT … ON CONFLICT ("firebaseUid") DO UPDATE that changes nothing.
      update: { firebaseUid: input.firebaseUid },
    });
  }
}
