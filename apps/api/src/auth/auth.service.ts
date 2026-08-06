import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { FirebaseService } from './firebase.service';
import { UsersRepository } from '../users/users.repository';

/*
 * v1 auth (debate D11): Firebase is the identity provider; roles + state live in
 * Postgres. The guard is a thin wrapper over this service so the resolution
 * logic is pure and unit-testable (no ExecutionContext mocking).
 *
 *   request ── bearer / x-dev-uid ──▶ resolveFirebaseUid ──▶ resolveAuthedUser
 *   POST /auth/session ─ bearer ─▶ sessionUpsert (creates the User row)
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
  // update it. Idempotent by the upsert's unique key.
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
}
