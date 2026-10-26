import { Logger } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { VerifiedIdentity } from './firebase.service';
import { INVITE_EMAIL_PROVIDERS, VerifiedEmailService, trustedEmail } from './verified-email.service';
import { fakeShopPrisma } from '../shops/testing/shop-prisma.fake';

/*
 * POST /auth/session keeps User.email in step with the token. That email is
 * what staff invites match on, so only a VERIFIED email from a provider that
 * proves ownership of the address may be written.
 */
const id = (over: Partial<VerifiedIdentity> = {}): VerifiedIdentity => ({
  firebaseUid: 'fb-u1',
  email: 'Ana@Example.com',
  emailVerified: true,
  signInProvider: 'password',
  ...over,
});

describe('trustedEmail', () => {
  it.each(['password', 'google.com', 'emailLink'])('%s + verified → lowercased, trimmed email', (p) => {
    expect(trustedEmail(id({ signInProvider: p, email: '  Ana@Example.COM ' }))).toBe('ana@example.com');
  });

  it('the allowed providers are exactly password, google.com, emailLink', () => {
    expect([...INVITE_EMAIL_PROVIDERS].sort()).toEqual(['emailLink', 'google.com', 'password']);
  });

  it.each([
    ['unverified', { emailVerified: false }],
    ['verified missing', { emailVerified: undefined }],
    ['phone provider', { signInProvider: 'phone' }],
    ['custom token', { signInProvider: 'custom' }],
    ['anonymous', { signInProvider: 'anonymous' }],
    ['no provider', { signInProvider: undefined }],
    ['no email', { email: undefined }],
    ['blank email', { email: '   ' }],
  ])('%s → null', (_l, over) => {
    expect(trustedEmail(id(over as Partial<VerifiedIdentity>))).toBeNull();
  });
});

describe('VerifiedEmailService.sync', () => {
  let error: jest.SpyInstance;
  beforeEach(() => {
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  function setup(over: Partial<User> = {}) {
    const fake = fakeShopPrisma({
      user: [{ id: 'u1', roles: ['CUSTOMER'], email: null, disabledAt: null, ...over } as never],
      shopInvite: [
        { id: 'i1', shopId: 's1', email: 'ana@example.com', role: 'STAFF', invitedByUserId: 'uO', createdAt: new Date(), acceptedAt: null, acceptedUserId: null, revokedAt: null },
      ],
    });
    const svc = new VerifiedEmailService(fake.prisma);
    const row = () => fake.tables.user[0] as unknown as User;
    return { svc, row, t: fake.tables, prisma: fake.prisma };
  }

  it('stores the trusted email lowercased and returns the updated user', async () => {
    const { svc, row } = setup();
    const out = await svc.sync(row(), id({ email: ' Ana@Example.com ' }));
    expect(row().email).toBe('ana@example.com');
    expect(out.email).toBe('ana@example.com');
  });

  it.each([
    ['unverified', { emailVerified: false }],
    ['phone provider', { signInProvider: 'phone' }],
    ['no email', { email: undefined }],
  ])('%s → stored email left untouched', async (_l, over) => {
    const { svc, row } = setup({ email: 'old@example.com' });
    await svc.sync(row(), id(over as Partial<VerifiedIdentity>));
    expect(row().email).toBe('old@example.com');
  });

  it('never accepts an invite or grants a role (acceptance is explicit now)', async () => {
    const { svc, row, t } = setup();
    await svc.sync(row(), id());
    expect(t.shopMember).toEqual([]);
    expect(t.shopInvite[0]).toMatchObject({ acceptedAt: null, acceptedUserId: null });
    expect(row().roles).toEqual(['CUSTOMER']);
  });

  it('no write when the stored email already matches', async () => {
    const { svc, row, prisma } = setup({ email: 'ana@example.com' });
    const update = jest.spyOn((prisma as { user: { update: () => unknown } }).user, 'update');
    await svc.sync(row(), id());
    expect(update).not.toHaveBeenCalled();
  });

  it('a disabled user is left untouched', async () => {
    const { svc, row } = setup({ disabledAt: new Date() });
    await svc.sync(row(), id());
    expect(row().email).toBeNull();
  });

  it('a failure never blocks sign-in and the log carries no email', async () => {
    const { svc, row, prisma } = setup();
    (prisma as { user: { update: unknown } }).user.update = () => Promise.reject(new Error('db down'));
    await expect(svc.sync(row(), id())).resolves.toMatchObject({ id: 'u1' });
    expect(error).toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/example\.com/i);
  });
});
