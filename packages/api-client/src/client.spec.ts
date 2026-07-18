import { ApiClient, ApiError, TokenProvider } from './client';

function res(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function tokensFrom(seq: (string | null)[]): TokenProvider & {
  refreshCalls: number;
} {
  let i = 0;
  const tp = {
    refreshCalls: 0,
    getToken: async () => (i < seq.length ? seq[i++] : seq[seq.length - 1]),
    refreshToken: async function (this: { refreshCalls: number }) {
      this.refreshCalls++;
      return 'refreshed-token';
    },
  };
  return tp as TokenProvider & { refreshCalls: number };
}

describe('ApiClient', () => {
  it('injects the bearer token and content-type', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test/',
      tokens: tokensFrom(['tok-1']),
      fetchFn,
    });

    await client.getShops();

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/shops'); // trailing slash on baseUrl trimmed
    expect(init.method).toBe('GET');
    expect(init.headers.authorization).toBe('Bearer tok-1');
    expect(init.headers['content-type']).toBe('application/json');
  });

  it('sends no authorization header when there is no token', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom([null]),
      fetchFn,
    });
    await client.getShops();
    expect(fetchFn.mock.calls[0][1].headers.authorization).toBeUndefined();
  });

  it('serializes the body for POST', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { customerTotalPhp: '222.00' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['tok']),
      fetchFn,
    });
    await client.previewOrder({ shopServiceId: 'ss1', weightKg: 6 });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/orders/preview');
    expect(JSON.parse(init.body)).toEqual({ shopServiceId: 'ss1', weightKg: 6 });
  });

  it('on 401 refreshes once and retries with the new token', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(res(401, { message: 'expired' }))
      .mockResolvedValueOnce(res(200, [{ id: 'o1' }]));
    const tokens = tokensFrom(['stale-token']);
    const client = new ApiClient({ baseUrl: 'http://api.test', tokens, fetchFn });

    const out = await client.listOrders();

    expect(out).toEqual([{ id: 'o1' }]);
    expect(tokens.refreshCalls).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    // second attempt used the refreshed token
    expect(fetchFn.mock.calls[1][1].headers.authorization).toBe(
      'Bearer refreshed-token',
    );
  });

  it('throws ApiError after a second 401 (refresh did not help)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(401, { message: 'nope' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await expect(client.getOrder('o1')).rejects.toBeInstanceOf(ApiError);
    // one original + one retry, then it gives up
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('maps a 4xx error body message into ApiError', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(res(400, { message: 'Pickup location is outside coverage' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await expect(
      client.createOrder({
        shopServiceId: 'ss1',
        pickupAddress: 'x',
        pickupLat: 1,
        pickupLng: 2,
        weightEstimateKg: 6,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Pickup location is outside coverage',
    });
  });

  it('sends x-dev-uid when devUid is set (Expo Go stub login)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom([null]),
      fetchFn,
      devUid: 'dev-customer',
    });
    await client.getShops();
    expect(fetchFn.mock.calls[0][1].headers['x-dev-uid']).toBe('dev-customer');
  });

  it('encodes the status query param on listOrders', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.listOrders('OUT_FOR_RETURN');
    expect(fetchFn.mock.calls[0][0]).toBe(
      'http://api.test/orders?status=OUT_FOR_RETURN',
    );
  });
});
