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
});
