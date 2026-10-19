import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { User } from '@prisma/client';
import { SessionDto, UpdateMeDto, toMe } from './auth.controller';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    firebaseUid: 'fb-1',
    phone: '+639171234567',
    displayName: 'Ana',
    roles: ['CUSTOMER'],
    createdAt: new Date(),
    disabledAt: null,
    ...overrides,
  } as User;
}

describe('toMe (GET /auth/me, POST /auth/session, PATCH /auth/me)', () => {
  it('returns the real mobile number', () => {
    expect(toMe(makeUser(), false)).toEqual({
      id: 'u1',
      phone: '+639171234567',
      displayName: 'Ana',
      roles: ['CUSTOMER'],
      emailVerified: false,
      inviteEmailOnFile: false,
    });
  });

  // The portal gates the "you have an invite?" prompt on a stored (verified)
  // email, which is what invite matching uses — not on this token's flag.
  it('inviteEmailOnFile is true exactly when User.email is set', () => {
    expect(toMe(makeUser({ email: 'ana@example.com' } as never), false).inviteEmailOnFile).toBe(true);
    expect(toMe(makeUser({ email: null } as never), true).inviteEmailOnFile).toBe(false);
    expect(JSON.stringify(toMe(makeUser({ email: 'ana@example.com' } as never), true))).not.toContain('ana@');
  });

  // The portal prompts for email verification before showing staff invites.
  it('carries emailVerified from the token', () => {
    expect(toMe(makeUser(), true).emailVerified).toBe(true);
  });

  // The app gates booking on `phone === null`; the placeholder is never shown.
  it('reports a placeholder phone as null', () => {
    expect(toMe(makeUser({ phone: 'pending:fb-1', displayName: '' }), false).phone).toBeNull();
  });
});

// The global ValidationPipe runs exactly this (plus whitelist /
// forbidNonWhitelisted, which reject any other field). The phone FORMAT is
// checked in AuthService.updateMe so the rule lives in one function.
describe('UpdateMeDto', () => {
  async function errors(body: unknown): Promise<string[]> {
    const errs = await validate(plainToInstance(UpdateMeDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errs.flatMap((e) => Object.values(e.constraints ?? {}));
  }

  it('accepts a name and/or phone, or nothing', async () => {
    expect(await errors({ name: 'Ana', phone: '0917 123 4567' })).toEqual([]);
    expect(await errors({ phone: '09171234567' })).toEqual([]);
    expect(await errors({})).toEqual([]);
  });

  it('rejects non-strings, over-long values and unknown fields', async () => {
    expect(await errors({ phone: 9171234567 })).not.toEqual([]);
    expect(await errors({ name: 'x'.repeat(81) })).not.toEqual([]);
    expect(await errors({ phone: '0'.repeat(33) })).not.toEqual([]);
    expect(await errors({ roles: ['ADMIN'] })).not.toEqual([]);
  });

  // @IsOptional() would skip every validator for null too, and the service
  // would then crash on null.replace / null.trim — a 500 instead of a 400.
  it('rejects an explicit null for either field', async () => {
    expect(await errors({ phone: null })).not.toEqual([]);
    expect(await errors({ name: null })).not.toEqual([]);
    expect(await errors({ name: null, phone: null })).not.toEqual([]);
  });
});

// POST /auth/session: the body is the token and nothing else. A client cannot
// supply the email that staff-invite acceptance keys on.
describe('SessionDto', () => {
  async function errors(body: unknown): Promise<string[]> {
    const errs = await validate(plainToInstance(SessionDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errs.flatMap((e) => Object.values(e.constraints ?? {}));
  }

  it('accepts just an idToken', async () => {
    expect(await errors({ idToken: 't' })).toEqual([]);
  });

  it.each([{ email: 'x@example.com' }, { emailVerified: true }, { roles: ['SHOP_STAFF'] }])(
    'refuses an extra %p',
    async (extra) => {
      expect(await errors({ idToken: 't', ...extra })).not.toEqual([]);
    },
  );
});
