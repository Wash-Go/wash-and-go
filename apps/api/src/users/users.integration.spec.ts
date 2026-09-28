import { ConflictException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { FirebaseService, VerifiedIdentity } from '../auth/firebase.service';
import { UsersRepository } from './users.repository';

/*
 * U0 T4 against real Postgres: POST /auth/session runs on every web load and
 * rider-app start (U0 T1), so its upsert must never clobber the name / mobile
 * number a user saved with PATCH /auth/me. And the unique index on User.phone
 * must surface as a human 409, which depends on the real P2002 error shape.
 */

const SUFFIX = `${Date.now()}`;
// Per-run last 7 digits, so reruns never collide with an old row's phone:
// `+63917${TAIL}` is a valid 10-digit national mobile number.
const TAIL = SUFFIX.slice(-7);

describe('Users session + profile (Postgres)', () => {
  const prisma = new PrismaService();
  const repo = new UsersRepository(prisma);
  // Only the identity matters here; the bearer is the Firebase uid to return.
  let identity: VerifiedIdentity;
  const firebase = {
    devBypass: false,
    verifyIdToken: async () => identity,
  } as unknown as FirebaseService;
  const auth = new AuthService(firebase, repo);
  const uids: string[] = [];

  function signIn(firebaseUid: string, phone?: string): Promise<User> {
    uids.push(firebaseUid);
    identity = { firebaseUid, phone };
    return auth.sessionUpsert({ bearer: 'token' });
  }

  beforeAll(() => prisma.$connect());

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { firebaseUid: { in: uids } } });
    await prisma.$disconnect();
  });

  it('first session creates a CUSTOMER with a placeholder phone and no name', async () => {
    const u = await signIn(`int-email-${SUFFIX}`);
    expect(u.phone).toBe(`pending:int-email-${SUFFIX}`);
    expect(u.displayName).toBe('');
    expect(u.roles).toEqual(['CUSTOMER']);
  });

  // The customer app's login screen and its root layout both call POST
  // /auth/session right after sign-up. The upsert must stay a single atomic
  // INSERT … ON CONFLICT so parallel first calls don't lose a P2002 race.
  it('parallel first sessions for one uid all succeed on one row', async () => {
    const uid = `int-race-${SUFFIX}`;
    uids.push(uid);
    identity = { firebaseUid: uid };
    // Open several pool connections first so the upserts really run in
    // parallel instead of queueing behind one warm connection.
    await Promise.all(
      Array.from({ length: 6 }, () => prisma.$executeRaw`SELECT pg_sleep(0.05)`),
    );
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => auth.sessionUpsert({ bearer: 'token' })),
    );
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
    const ids = results.map((r) => (r as PromiseFulfilledResult<User>).value.id);
    expect(new Set(ids).size).toBe(1);
  });

  it('a later session never overwrites the saved name, mobile number or roles', async () => {
    const uid = `int-keep-${SUFFIX}`;
    const created = await signIn(uid);
    await auth.updateMe(created, {
      name: 'Ana Cruz',
      phone: `0917 ${TAIL.slice(0, 3)} ${TAIL.slice(3)}`,
    });
    await prisma.user.update({ where: { id: created.id }, data: { roles: ['CUSTOMER', 'RIDER'] } });

    // Same identity again: email accounts carry no phone_number claim.
    const again = await signIn(uid);
    const expectedPhone = `+63917${TAIL}`;
    expect(again.id).toBe(created.id);
    expect(again.phone).toBe(expectedPhone);
    expect(again.displayName).toBe('Ana Cruz');
    expect(again.roles).toEqual(['CUSTOMER', 'RIDER']);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.phone).toBe(expectedPhone);
    expect(row.displayName).toBe('Ana Cruz');
  });

  it('keeps a saved number even when the token later carries a different phone', async () => {
    const uid = `int-token-${SUFFIX}`;
    const created = await signIn(uid);
    await auth.updateMe(created, { phone: `0918${TAIL}` });
    const again = await signIn(uid, `+63919${TAIL}`);
    expect(again.phone).toBe(`+63918${TAIL}`);
  });

  it('stores a phone-auth identity’s verified number on first create', async () => {
    const phone = `+63920${TAIL}`;
    const u = await signIn(`int-phoneauth-${SUFFIX}`, phone);
    expect(u.phone).toBe(phone);
  });

  it('refuses another account’s mobile number with a human 409 and keeps the placeholder', async () => {
    const owner = await signIn(`int-owner-${SUFFIX}`);
    await auth.updateMe(owner, { phone: `0921${TAIL}` });
    const other = await signIn(`int-dupe-${SUFFIX}`);

    const err = await auth
      .updateMe(other, { phone: `+63 921 ${TAIL}` })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).message).toBe(
      'That mobile number is already used by another account.',
    );
    const row = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect(row.phone).toBe(`pending:int-dupe-${SUFFIX}`);
  });
});
