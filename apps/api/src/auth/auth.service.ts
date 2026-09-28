import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { FirebaseService } from './firebase.service';
import { UsersRepository } from '../users/users.repository';
import { normalizePhMobile } from '../users/phone';
import { isUniqueViolation } from '../common/prisma-errors';

export const DUPLICATE_PHONE_MESSAGE =
  'That mobile number is already used by another account.';
export const INVALID_PHONE_MESSAGE =
  'Enter a Philippine mobile number, like 0917 123 4567.';

/*
 * v1 auth (debate D11): Firebase is the identity provider; roles + state live in
 * Postgres. The guard is a thin wrapper over this service so the resolution
 * logic is pure and unit-testable (no ExecutionContext mocking).
 *
 *   request ── bearer / x-dev-uid ──▶ resolveFirebaseUid ──▶ resolveAuthedUser
 *   POST /auth/session ─ bearer ─▶ sessionUpsert (creates the User row)
 *   PATCH /auth/me ─ authed user ─▶ updateMe (own name / mobile number)
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly users: UsersRepository,
  ) {}

  // Real Firebase token WINS (the Admin SDK is initialized): if a bearer is
  // present, verify it. Dev-bypass (x-dev-uid) is only a fallback for clients
  // that don't mint tokens yet (rider app + portals) — so a real-auth client
  // (customer app) and stub clients coexist under one AUTH_DEV_BYPASS flag.
  async resolveFirebaseUid(input: {
    bearer: string | null;
    devUid: string | null;
  }): Promise<string> {
    if (input.bearer) {
      const identity = await this.firebase.verifyIdToken(input.bearer);
      return identity.firebaseUid;
    }
    if (this.firebase.devBypass) {
      if (!input.devUid) {
        throw new UnauthorizedException('Missing x-dev-uid (dev bypass)');
      }
      return input.devUid;
    }
    throw new UnauthorizedException('Missing bearer token');
  }

  async resolveAuthedUser(firebaseUid: string): Promise<User> {
    const user = await this.users.findByFirebaseUid(firebaseUid);
    if (!user || user.disabledAt) {
      throw new UnauthorizedException('User not found or disabled');
    }
    return user;
  }

  // POST /auth/session — first sign-in creates the Postgres user; repeat calls
  // return it untouched (they run on every app load, so they must never reset
  // the name / mobile number saved via PATCH /auth/me). Idempotent by the
  // upsert's unique key.
  async sessionUpsert(input: { bearer: string | null }): Promise<User> {
    if (!input.bearer) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const identity = await this.firebase.verifyIdToken(input.bearer);
    return this.users.upsertByFirebaseUid({
      firebaseUid: identity.firebaseUid,
      phone: identity.phone,
    });
  }

  // PATCH /auth/me — any signed-in user sets their OWN name and/or mobile
  // number. The number is normalized to +639XXXXXXXXX (so one number typed two
  // ways is still one number for the unique index); anything else is a 400.
  async updateMe(
    user: User,
    input: { name?: string; phone?: string },
  ): Promise<User> {
    const data: { displayName?: string; phone?: string } = {};
    // `undefined` = not sent (leave as is). Anything else that isn't a string
    // (e.g. null from a non-HTTP caller) is a 400, never a TypeError.
    if (input.name !== undefined) {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (!name) throw new BadRequestException('Enter your name.');
      data.displayName = name;
    }
    if (input.phone !== undefined) {
      const phone =
        typeof input.phone === 'string' ? normalizePhMobile(input.phone) : null;
      if (!phone) throw new BadRequestException(INVALID_PHONE_MESSAGE);
      data.phone = phone;
    }
    if (Object.keys(data).length === 0) return user;
    try {
      return await this.users.updateProfile(user.id, data);
    } catch (e) {
      if (isUniqueViolation(e, 'phone')) {
        throw new ConflictException(DUPLICATE_PHONE_MESSAGE);
      }
      throw e;
    }
  }
}
