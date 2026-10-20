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
import { VerifiedEmailService, trustedEmail } from './verified-email.service';

export const DUPLICATE_PHONE_MESSAGE =
  'That mobile number is already used by another account.';
export const INVALID_PHONE_MESSAGE =
  'Enter a Philippine mobile number, like 0917 123 4567.';

/*
 * v1 auth (debate D11): Firebase is the identity provider; roles + state live in
 * Postgres. The guard is a thin wrapper over this service so the resolution
 * logic is pure and unit-testable (no ExecutionContext mocking).
 *
 *   request ── bearer / x-dev-uid ──▶ resolveIdentity ──▶ resolveAuthedUser
 *   POST /auth/session ─ bearer ─▶ startSession (creates the User row, then
 *                                   syncs User.email from the token's
 *                                   VERIFIED email — never a body field;
 *                                   invites are accepted explicitly)
 *   PATCH /auth/me ─ authed user ─▶ updateMe (own name / mobile number)
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly users: UsersRepository,
    private readonly emailSync: VerifiedEmailService,
  ) {}

  // Real Firebase token WINS (the Admin SDK is initialized): if a bearer is
  // present, verify it. Dev-bypass (x-dev-uid) is only a fallback for clients
  // that don't mint tokens yet (rider app + portals) — so a real-auth client
  // (customer app) and stub clients coexist under one AUTH_DEV_BYPASS flag.
  //
  // `emailVerified` is true only for a real token whose email is trusted for
  // invite matching (trustedEmail); the dev stub is never email-verified.
  async resolveIdentity(input: {
    bearer: string | null;
    devUid: string | null;
  }): Promise<{ firebaseUid: string; emailVerified: boolean }> {
    if (input.bearer) {
      const identity = await this.firebase.verifyIdToken(input.bearer);
      return {
        firebaseUid: identity.firebaseUid,
        emailVerified: trustedEmail(identity) !== null,
      };
    }
    if (this.firebase.devBypass) {
      if (!input.devUid) {
        throw new UnauthorizedException('Missing x-dev-uid (dev bypass)');
      }
      return { firebaseUid: input.devUid, emailVerified: false };
    }
    throw new UnauthorizedException('Missing bearer token');
  }

  async resolveFirebaseUid(input: {
    bearer: string | null;
    devUid: string | null;
  }): Promise<string> {
    return (await this.resolveIdentity(input)).firebaseUid;
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
  async startSession(input: {
    bearer: string | null;
  }): Promise<{ user: User; emailVerified: boolean }> {
    if (!input.bearer) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const identity = await this.firebase.verifyIdToken(input.bearer);
    const user = await this.users.upsertByFirebaseUid({
      firebaseUid: identity.firebaseUid,
      phone: identity.phone,
    });
    // Only syncs User.email from the trusted token email; never grants a role
    // and never throws (a failure is logged and retried next session).
    return {
      user: await this.emailSync.sync(user, identity),
      emailVerified: trustedEmail(identity) !== null,
    };
  }

  async sessionUpsert(input: { bearer: string | null }): Promise<User> {
    return (await this.startSession(input)).user;
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
