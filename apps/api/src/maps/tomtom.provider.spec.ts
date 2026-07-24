import { TomTomProvider, type FetchLike } from './tomtom.provider';

function mockFetch(
  handler: (url: string) => { ok: boolean; status: number; body: unknown },
): FetchLike {
  return async (url: string) => {
    const r = handler(url);
    return { ok: r.ok, status: r.status, json: async () => r.body };
  };
}

const KEY = 'test-key';

describe('TomTomProvider', () => {
  describe('geocode', () => {
    it('maps the first fuzzy-search result to a GeocodeResult', async () => {
      const fetchFn = mockFetch((url) => {
        expect(url).toContain('/search/2/search/');
        expect(url).toContain('countrySet=PH');
        expect(url).toContain(`key=${KEY}`);
        return {
          ok: true,
          status: 200,
          body: {
            results: [
              {
                position: { lat: 6.92977, lon: 122.08719 },
                address: { freeformAddress: 'Tetuan, Zamboanga City' },
                score: 6.36,
              },
            ],
          },
        };
      });
      const r = await new TomTomProvider(KEY, fetchFn).geocode('Tetuan');
      expect(r).toEqual({
        point: { lat: 6.92977, lng: 122.08719 },
        label: 'Tetuan, Zamboanga City',
        score: 6.36,
      });
    });

    it('returns null on no results', async () => {
      const fetchFn = mockFetch(() => ({ ok: true, status: 200, body: { results: [] } }));
      expect(await new TomTomProvider(KEY, fetchFn).geocode('nowhere')).toBeNull();
    });

    it('degrades to null on a 403 (product not enabled) rather than throwing', async () => {
      const fetchFn = mockFetch(() => ({ ok: false, status: 403, body: {} }));
      expect(await new TomTomProvider(KEY, fetchFn).geocode('x')).toBeNull();
    });
  });

  describe('route', () => {
    it('converts routing meters → km and reads the duration', async () => {
      const fetchFn = mockFetch((url) => {
        expect(url).toContain('/routing/1/calculateRoute/');
        expect(url).toContain('6.9214,122.079:6.9111,122.0794');
        return {
          ok: true,
          status: 200,
          body: {
            routes: [{ summary: { lengthInMeters: 1218, travelTimeInSeconds: 371 } }],
          },
        };
      });
      const r = await new TomTomProvider(KEY, fetchFn).route(
        { lat: 6.9214, lng: 122.079 },
        { lat: 6.9111, lng: 122.0794 },
      );
      expect(r).toEqual({ distanceKm: 1.218, durationSec: 371 });
    });

    it('throws on a routing HTTP error (caller needs a distance to price)', async () => {
      const fetchFn = mockFetch(() => ({ ok: false, status: 429, body: {} }));
      await expect(
        new TomTomProvider(KEY, fetchFn).route(
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
        ),
      ).rejects.toThrow(/routing failed \(429\)/);
    });

    it('throws when no route is returned', async () => {
      const fetchFn = mockFetch(() => ({ ok: true, status: 200, body: { routes: [] } }));
      await expect(
        new TomTomProvider(KEY, fetchFn).route({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }),
      ).rejects.toThrow(/no route/);
    });
  });

  describe('reverseGeocode', () => {
    it('returns the freeform address', async () => {
      const fetchFn = mockFetch((url) => {
        expect(url).toContain('/search/2/reverseGeocode/6.9111,122.0794.json');
        return {
          ok: true,
          status: 200,
          body: { addresses: [{ address: { freeformAddress: 'Tetuan, ZC' } }] },
        };
      });
      expect(
        await new TomTomProvider(KEY, fetchFn).reverseGeocode({ lat: 6.9111, lng: 122.0794 }),
      ).toBe('Tetuan, ZC');
    });

    it('degrades to null when the Reverse Geocoding product is off (403)', async () => {
      const fetchFn = mockFetch(() => ({ ok: false, status: 403, body: {} }));
      expect(
        await new TomTomProvider(KEY, fetchFn).reverseGeocode({ lat: 1, lng: 1 }),
      ).toBeNull();
    });
  });
});
