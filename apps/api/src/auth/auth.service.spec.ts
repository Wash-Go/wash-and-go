import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { AuthService } from './auth.service';
import type { FirebaseService } from './firebase.service';
import type { UsersRepository } from '../users/users.repository';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    firebaseUid: 'fb-123',
    phone: '+639170000000',
    displayName: 'Test',
    roles: ['CUSTOMER'],
    createdAt: new Date(),
    disabledAt: null,
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let firebase: jest.Mocked<Pick<FirebaseService, 'verifyIdToken' | 'devBypass'>>;
  let users: jest.Mocked<
    Pick<UsersRepository, 'findByFirebaseUid' | 'upsertByFirebaseUid' | 'updateProfile'>
  >;
  let service: AuthService;

  beforeEach(() => {
    firebase = {
      verifyIdToken: jest.fn(),
      devBypass: false,
    } as unknown as jest.Mocked<
      Pick<FirebaseService, 'verifyIdToken' | 'devBypass'>
    >;
    users = {
      findByFirebaseUid: jest.fn(),
      upsertByFirebaseUid: jest.fn(),
      updateProfile: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<UsersRepository, 'findByFirebaseUid' | 'upsertByFirebaseUid' | 'updateProfile'>
    >;
    service = new AuthService(
      firebase as unknown as FirebaseService,
      users as unknown as UsersRepository,
    );
  });

  describe('resolveFirebaseUid', () => {
    it('verifies the bearer token when not in bypass mode', async () => {
      firebase.verifyIdToken.mockResolvedValue({ firebaseUid: 'fb-xyz' });
      const uid = await service.resolveFirebaseUid({ bearer: 'tok', devUid: null });
      expect(uid).toBe('fb-xyz');
      expect(firebase.verifyIdToken).toHaveBeenCalledWith('tok');
    });

    it('throws when no bearer and no bypass', async () => {
      await expect(
        service.resolveFirebaseUid({ bearer: null, devUid: null }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    // Real token wins even under dev bypass (Admin SDK is initialized): a
    // bearer-bearing client (customer app) is verified, not stubbed.
    it('prefers the bearer token even under dev bypass (real token wins)', async () => {
      (firebase as { devBypass: boolean }).devBypass = true;
      firebase.verifyIdToken.mockResolvedValue({ firebaseUid: 'fb-real' });
      const uid = await service.resolveFirebaseUid({
        bearer: 'real-token',
        devUid: 'dev-abc',
      });
      expect(uid).toBe('fb-real');
      expect(firebase.verifyIdToken).toHaveBeenCalledWith('real-token');
    });

    it('falls back to the dev header under bypass when no bearer', async () => {
      (firebase as { devBypass: boolean }).devBypass = true;
      const uid = await service.resolveFirebaseUid({
        bearer: null,
        devUid: 'dev-abc',
      });
      expect(uid).toBe('dev-abc');
      expect(firebase.verifyIdToken).not.toHaveBeenCalled();
    });

    it('throws under dev bypass when the dev header is missing', async () => {
      (firebase as { devBypass: boolean }).devBypass = true;
      await expect(
        service.resolveFirebaseUid({ bearer: null, devUid: null }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('resolveAuthedUser', () => {
    it('returns the user for a known uid', async () => {
      const u = makeUser();
      users.findByFirebaseUid.mockResolvedValue(u);
      await expect(service.resolveAuthedUser('fb-123')).resolves.toBe(u);
    });

    it('throws when the user is not found', async () => {
      users.findByFirebaseUid.mockResolvedValue(null);
      await expect(service.resolveAuthedUser('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when the user is disabled', async () => {
      users.findByFirebaseUid.mockResolvedValue(
        makeUser({ disabledAt: new Date() }),
      );
      await expect(service.resolveAuthedUser('fb-123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('sessionUpsert', () => {
    it('upserts the user keyed by firebase uid (idempotent by construction)', async () => {
      firebase.verifyIdToken.mockResolvedValue({
        firebaseUid: 'fb-new',
        phone: '+639170000001',
      });
      const u = makeUser({ firebaseUid: 'fb-new' });
      users.upsertByFirebaseUid.mockResolvedValue(u);

      const result = await service.sessionUpsert({ bearer: 'tok' });

      expect(result).toBe(u);
      expect(users.upsertByFirebaseUid).toHaveBeenCalledWith({
        firebaseUid: 'fb-new',
        phone: '+639170000001',
      });
    });

    it('rejects a session request with no bearer token', async () => {
      await expect(service.sessionUpsert({ bearer: null })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  // U0 T4: PATCH /auth/me — the signed-in user sets their own name / mobile.
  describe('updateMe', () => {
    const DUPLICATE = 'That mobile number is already used by another account.';

    function p2002(target: string[]): Prisma.PrismaClientKnownRequestError {
      return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target },
      });
    }

    it('stores the trimmed name and the E.164-normalized mobile number', async () => {
      const me = makeUser({ id: 'u1', phone: 'pending:fb-123', displayName: '' });
      const saved = makeUser({ id: 'u1', phone: '+639171234567', displayName: 'Ana Cruz' });
      users.updateProfile.mockResolvedValue(saved);

      const result = await service.updateMe(me, {
        name: '  Ana Cruz ',
        phone: '0917 123-4567',
      });

      expect(result).toBe(saved);
      expect(users.updateProfile).toHaveBeenCalledWith('u1', {
        displayName: 'Ana Cruz',
        phone: '+639171234567',
      });
    });

    it.each(['9171234567', '+639171234567', '639171234567', '09171234567'])(
      'accepts the %p form and stores +639171234567',
      async (raw) => {
        users.updateProfile.mockResolvedValue(makeUser());
        await service.updateMe(makeUser(), { phone: raw });
        expect(users.updateProfile).toHaveBeenCalledWith('u1', {
          phone: '+639171234567',
        });
      },
    );

    it('updates only the fields sent', async () => {
      users.updateProfile.mockResolvedValue(makeUser());
      await service.updateMe(makeUser(), { name: 'Ana' });
      expect(users.updateProfile).toHaveBeenCalledWith('u1', { displayName: 'Ana' });
    });

    it.each(['0917123456', '08171234567', '+1 917 123 4567', 'pending:x', ''])(
      'rejects %p with a 400 and writes nothing',
      async (raw) => {
        await expect(
          service.updateMe(makeUser(), { phone: raw }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(users.updateProfile).not.toHaveBeenCalled();
      },
    );

    // Defence in depth behind the DTO: a null that reaches the service is a
    // 400, never a TypeError (500).
    it.each([{ phone: null }, { name: null }, { name: null, phone: '09171234567' }])(
      'rejects %p with a 400 and writes nothing',
      async (body) => {
        await expect(
          service.updateMe(makeUser(), body as never),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(users.updateProfile).not.toHaveBeenCalled();
      },
    );

    it('rejects a blank name with a 400 and writes nothing', async () => {
      await expect(
        service.updateMe(makeUser(), { name: '   ', phone: '09171234567' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.updateProfile).not.toHaveBeenCalled();
    });

    it('turns a duplicate mobile number into a 409 with human copy', async () => {
      users.updateProfile.mockRejectedValue(p2002(['phone']));
      const err = await service
        .updateMe(makeUser(), { phone: '09171234567' })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).message).toBe(DUPLICATE);
    });

    it('does not mislabel a different unique violation as a duplicate phone', async () => {
      const other = p2002(['firebaseUid']);
      users.updateProfile.mockRejectedValue(other);
      await expect(
        service.updateMe(makeUser(), { phone: '09171234567' }),
      ).rejects.toBe(other);
    });

    it('returns the user unchanged when nothing is sent', async () => {
      const me = makeUser();
      await expect(service.updateMe(me, {})).resolves.toBe(me);
      expect(users.updateProfile).not.toHaveBeenCalled();
    });
  });
});
