import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import type { UsersRepository } from './users.repository';

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    firebaseUid: 'fb-u1',
    phone: '+639170000000',
    displayName: 'User One',
    roles: ['CUSTOMER'] as UserRole[],
    disabledAt: null,
    createdAt: new Date('2026-07-20T00:00:00Z'),
    ...over,
  }) as User;

describe('AdminUsersService', () => {
  let repo: jest.Mocked<UsersRepository>;
  let service: AdminUsersService;

  beforeEach(() => {
    repo = {
      listUsers: jest.fn(),
      findById: jest.fn(),
      updateRoles: jest.fn(),
      setDisabledAt: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new AdminUsersService(repo);
  });

  describe('list', () => {
    it('shapes users and forwards the filter', async () => {
      repo.listUsers.mockResolvedValue([makeUser({ roles: ['CUSTOMER', 'RIDER'] })]);
      const out = await service.list({ role: 'RIDER', q: 'one' });
      expect(repo.listUsers).toHaveBeenCalledWith({ role: 'RIDER', q: 'one' });
      expect(out[0]).toMatchObject({ id: 'u1', roles: ['CUSTOMER', 'RIDER'], disabledAt: null });
    });
  });

  describe('setRoles', () => {
    it('grants a role (dedupes, replaces the set)', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.updateRoles.mockImplementation((id, roles) =>
        Promise.resolve(makeUser({ id, roles })),
      );
      const out = await service.setRoles(makeUser({ id: 'admin' }), 'u1', [
        'CUSTOMER',
        'RIDER',
        'RIDER',
      ] as UserRole[]);
      expect(repo.updateRoles).toHaveBeenCalledWith('u1', ['CUSTOMER', 'RIDER']);
      expect(out.roles).toEqual(['CUSTOMER', 'RIDER']);
    });

    it('404s a missing user', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.setRoles(makeUser({ id: 'admin' }), 'nope', ['ADMIN']),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stops an admin from removing their own ADMIN role', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'me', roles: ['ADMIN'] }));
      await expect(
        service.setRoles(makeUser({ id: 'me', roles: ['ADMIN'] }), 'me', [
          'CUSTOMER',
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.updateRoles).not.toHaveBeenCalled();
    });
  });

  describe('setDisabled', () => {
    it('disables another account', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'u2' }));
      repo.setDisabledAt.mockImplementation((id, d) =>
        Promise.resolve(makeUser({ id, disabledAt: d })),
      );
      const out = await service.setDisabled(makeUser({ id: 'admin' }), 'u2', true);
      expect(out.disabledAt).not.toBeNull();
      expect(repo.setDisabledAt).toHaveBeenCalledWith('u2', expect.any(Date));
    });

    it('re-enables (clears disabledAt)', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'u2', disabledAt: new Date() }));
      repo.setDisabledAt.mockResolvedValue(makeUser({ id: 'u2', disabledAt: null }));
      const out = await service.setDisabled(makeUser({ id: 'admin' }), 'u2', false);
      expect(out.disabledAt).toBeNull();
      expect(repo.setDisabledAt).toHaveBeenCalledWith('u2', null);
    });

    it('forbids disabling your own account', async () => {
      await expect(
        service.setDisabled(makeUser({ id: 'me' }), 'me', true),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.setDisabledAt).not.toHaveBeenCalled();
    });
  });
});
