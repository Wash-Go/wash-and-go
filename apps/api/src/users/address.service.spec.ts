import { NotFoundException } from '@nestjs/common';
import { AddressService } from './address.service';
import type { AddressRepository } from './address.repository';

const addr = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  userId: 'user1',
  label: 'Home',
  line: 'Tetuan',
  lat: null,
  lng: null,
  isDefault: false,
  createdAt: new Date(),
  ...over,
});

describe('AddressService', () => {
  let repo: jest.Mocked<AddressRepository>;
  let service: AddressService;

  beforeEach(() => {
    repo = {
      findByUser: jest.fn(),
      findById: jest.fn(),
      clearDefaults: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      // Run the tx callback with a throwaway client.
      transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    } as unknown as jest.Mocked<AddressRepository>;
    service = new AddressService(repo);
  });

  describe('create', () => {
    it('creates without touching other defaults when not default', async () => {
      repo.create.mockResolvedValue(addr() as never);
      await service.create('user1', { line: 'Tetuan' });
      expect(repo.clearDefaults).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'user1', line: 'Tetuan', isDefault: false }),
      );
    });

    it('clears sibling defaults first when isDefault is set', async () => {
      repo.create.mockResolvedValue(addr({ isDefault: true }) as never);
      await service.create('user1', { line: 'Office', isDefault: true });
      expect(repo.clearDefaults).toHaveBeenCalledWith(expect.anything(), 'user1');
    });
  });

  describe('update', () => {
    it('404s an address owned by someone else (no leak, no write)', async () => {
      repo.findById.mockResolvedValue(addr({ userId: 'other' }) as never);
      await expect(
        service.update('user1', 'a1', { line: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('404s a missing address', async () => {
      repo.findById.mockResolvedValue(null as never);
      await expect(
        service.update('user1', 'nope', { line: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('clears other defaults (except self) when promoting to default', async () => {
      repo.findById.mockResolvedValue(addr() as never);
      repo.update.mockResolvedValue(addr({ isDefault: true }) as never);
      await service.update('user1', 'a1', { isDefault: true });
      expect(repo.clearDefaults).toHaveBeenCalledWith(expect.anything(), 'user1', 'a1');
    });

    it('does not clear defaults on a plain field edit', async () => {
      repo.findById.mockResolvedValue(addr() as never);
      repo.update.mockResolvedValue(addr({ line: 'New' }) as never);
      await service.update('user1', 'a1', { line: 'New' });
      expect(repo.clearDefaults).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an owned address', async () => {
      repo.findById.mockResolvedValue(addr() as never);
      await service.remove('user1', 'a1');
      expect(repo.delete).toHaveBeenCalledWith('a1');
    });

    it('404s and does not delete an unowned address', async () => {
      repo.findById.mockResolvedValue(addr({ userId: 'other' }) as never);
      await expect(service.remove('user1', 'a1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
