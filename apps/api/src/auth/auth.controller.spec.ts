import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { User } from '@prisma/client';
import { UpdateMeDto, toMe } from './auth.controller';

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
    expect(toMe(makeUser())).toEqual({
      id: 'u1',
      phone: '+639171234567',
      displayName: 'Ana',
      roles: ['CUSTOMER'],
    });
  });

  // The app gates booking on `phone === null`; the placeholder is never shown.
  it('reports a placeholder phone as null', () => {
    expect(toMe(makeUser({ phone: 'pending:fb-1', displayName: '' })).phone).toBeNull();
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
});
