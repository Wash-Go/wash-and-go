import { isWithinCoverage } from './coverage';

describe('isWithinCoverage', () => {
  it('accepts a point in central Zamboanga City', () => {
    // City center ~ 6.9214, 122.0790
    expect(isWithinCoverage({ lng: 122.079, lat: 6.9214 })).toBe(true);
  });

  it('accepts the two seed shop locations', () => {
    expect(isWithinCoverage({ lng: 122.0794, lat: 6.9111 })).toBe(true); // Tetuan
    expect(isWithinCoverage({ lng: 122.0865, lat: 6.9245 })).toBe(true); // Guiwan
  });

  it('rejects Manila (well outside)', () => {
    expect(isWithinCoverage({ lng: 120.9842, lat: 14.5995 })).toBe(false);
  });

  it('rejects a point just west of the coverage ring', () => {
    expect(isWithinCoverage({ lng: 121.9, lat: 6.92 })).toBe(false);
  });

  it('rejects a point just north of the coverage ring', () => {
    expect(isWithinCoverage({ lng: 122.08, lat: 7.05 })).toBe(false);
  });
});
