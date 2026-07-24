import { UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
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
    Pick<UsersRepository, 'findByFirebaseUid' | 'upsertByFirebaseUid'>
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
    } as unknown as jest.Mocked<
      Pick<UsersRepository, 'findByFirebaseUid' | 'upsertByFirebaseUid'>
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
});
