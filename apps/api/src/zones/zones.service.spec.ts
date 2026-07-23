import { BadRequestException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import type { ZonesRepository } from './zones.repository';

const CENTRAL_ZC = { lat: 6.9111, lng: 122.0794 };
const MANILA = { lat: 14.6, lng: 120.98 };

const zone = (over: Record<string, unknown> = {}) => ({
  id: 'z1',
  name: 'Zone A',
  active: true,
  // small ring around central ZC
  polygon: [
    { lat: 6.88, lng: 122.05 },
    { lat: 6.88, lng: 122.11 },
    { lat: 6.94, lng: 122.11 },
    { lat: 6.94, lng: 122.05 },
  ],
  createdAt: new Date(),
  ...over,
});

describe('ZonesService', () => {
  let repo: jest.Mocked<ZonesRepository>;
  let service: ZonesService;

  beforeEach(() => {
    repo = {
      findActive: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<ZonesRepository>;
    service = new ZonesService(repo);
  });

  describe('isCovered', () => {
    it('falls back to the pilot ring when no zones exist (central ZC covered)', async () => {
      repo.findActive.mockResolvedValue([]);
      expect(await service.isCovered(CENTRAL_ZC)).toBe(true);
      expect(await service.isCovered(MANILA)).toBe(false);
    });

    it('is covered when the point is in an active zone', async () => {
      repo.findActive.mockResolvedValue([zone()] as never);
      expect(await service.isCovered(CENTRAL_ZC)).toBe(true);
    });

    it('is NOT covered when zones exist but none contain the point', async () => {
      repo.findActive.mockResolvedValue([zone()] as never);
      expect(await service.isCovered(MANILA)).toBe(false);
    });
  });

  describe('resolve', () => {
    it('returns the containing zone', async () => {
      repo.findActive.mockResolvedValue([zone({ id: 'zc' })] as never);
      const z = await service.resolve(CENTRAL_ZC);
      expect(z?.id).toBe('zc');
    });

    it('returns null when nothing contains the point', async () => {
      repo.findActive.mockResolvedValue([zone()] as never);
      expect(await service.resolve(MANILA)).toBeNull();
    });
  });

  describe('create', () => {
    it('rejects a polygon with < 3 vertices', async () => {
      await expect(
        service.create('X', [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a vertex missing lat/lng', async () => {
      await expect(
        service.create('X', [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
          { lat: 3 } as never,
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a valid zone', async () => {
      repo.create.mockResolvedValue(zone() as never);
      await service.create('Zone A', [
        { lat: 6.88, lng: 122.05 },
        { lat: 6.88, lng: 122.11 },
        { lat: 6.94, lng: 122.08 },
      ]);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Zone A' }),
      );
    });
  });
});
