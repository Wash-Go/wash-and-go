import { BadRequestException } from '@nestjs/common';
import type { MapsProvider } from '@wash-and-go/maps';
import { GeocodeController } from './geocode.controller';

describe('GeocodeController', () => {
  const result = {
    point: { lat: 6.9, lng: 122.08 },
    label: 'Tetuan, Zamboanga City',
    score: 6.36,
  };
  let maps: jest.Mocked<MapsProvider>;
  let ctrl: GeocodeController;

  beforeEach(() => {
    maps = {
      name: 'stub',
      geocode: jest.fn().mockResolvedValue(result),
      search: jest.fn().mockResolvedValue([result]),
      reverseGeocode: jest.fn(),
      route: jest.fn(),
    };
    ctrl = new GeocodeController(maps);
  });

  it('delegates a trimmed query to the provider', async () => {
    expect(await ctrl.geocode('  Tetuan  ')).toBe(result);
    expect(maps.geocode).toHaveBeenCalledWith('Tetuan');
  });

  it('rejects a too-short / missing query', async () => {
    await expect(ctrl.geocode('a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctrl.geocode()).rejects.toBeInstanceOf(BadRequestException);
    expect(maps.geocode).not.toHaveBeenCalled();
  });

  it('passes through a null (no-match) result', async () => {
    maps.geocode.mockResolvedValue(null);
    expect(await ctrl.geocode('nowhere')).toBeNull();
  });

  describe('search (autocomplete)', () => {
    it('delegates a trimmed query with the requested limit', async () => {
      expect(await ctrl.search('  Tetuan  ', '6')).toEqual([result]);
      expect(maps.search).toHaveBeenCalledWith('Tetuan', 6);
    });

    it('short-circuits to [] for < 3 chars without hitting the provider', async () => {
      expect(await ctrl.search('ab')).toEqual([]);
      expect(await ctrl.search()).toEqual([]);
      expect(maps.search).not.toHaveBeenCalled();
    });

    it('defaults to a limit of 5 when limit is absent or invalid', async () => {
      await ctrl.search('Tetuan');
      await ctrl.search('Tetuan', 'abc');
      expect(maps.search).toHaveBeenNthCalledWith(1, 'Tetuan', 5);
      expect(maps.search).toHaveBeenNthCalledWith(2, 'Tetuan', 5);
    });
  });
});
