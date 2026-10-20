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
    // No body ⇒ no content-type (Fastify 500s on empty json bodies).
    expect(init.headers['content-type']).toBeUndefined();
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
    // A body ⇒ content-type is set.
    expect(init.headers['content-type']).toBe('application/json');
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
        loadCategory: 'M',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Pickup location is outside coverage',
    });
  });

  it('posts the id token in the body for /auth/session', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'u1', roles: ['CUSTOMER'] }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['fb-id-token']),
      fetchFn,
    });
    await client.postSession();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/auth/session');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ idToken: 'fb-id-token' });
  });

  it('gets the signed-in user from /auth/me', async () => {
    const me = { id: 'u1', phone: null, displayName: '', roles: ['CUSTOMER'] };
    const fetchFn = jest.fn().mockResolvedValue(res(200, me));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['tok']),
      fetchFn,
    });
    await expect(client.getMe()).resolves.toEqual(me);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/auth/me');
    expect(init.method).toBe('GET');
  });

  it('patches the own name / mobile number on /auth/me', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        res(200, { id: 'u1', phone: '+639171234567', displayName: 'Ana', roles: ['CUSTOMER'] }),
      );
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['tok']),
      fetchFn,
    });
    const me = await client.updateMe({ name: 'Ana', phone: '0917 123 4567' });
    expect(me.phone).toBe('+639171234567');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/auth/me');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', phone: '0917 123 4567' });
  });

  it('surfaces a duplicate-number 409 as an ApiError with the status', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      res(409, { message: 'That mobile number is already used by another account.' }),
    );
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['tok']),
      fetchFn,
    });
    await expect(client.updateMe({ phone: '09171234567' })).rejects.toMatchObject({
      status: 409,
      message: 'That mobile number is already used by another account.',
    });
  });

  it('gets riders', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.getRiders();
    expect(fetchFn.mock.calls[0][0]).toBe('http://api.test/riders');
  });

  it('assigns a rider', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'o1' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.assignRider('o1', 'r1');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/orders/o1/assign-rider');
    expect(JSON.parse(init.body)).toEqual({ riderId: 'r1' });
  });

  it('weighs an order', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'o1' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.weigh('o1', 6.4);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/orders/o1/weigh');
    expect(JSON.parse(init.body)).toEqual({ weightKg: 6.4 });
  });

  it('posts a status transition', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'o1', status: 'PICKED_UP' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.transition('o1', 'PICKED_UP');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/orders/o1/status');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ status: 'PICKED_UP' });
  });

  it('posts pay-cash with no body', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'o1' }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.payCash('o1');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/orders/o1/pay-cash');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
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

  it('reads the customer booking rules from GET /config/booking', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(res(200, { expressWeightThresholdKg: 8 }));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await expect(client.getBookingConfig()).resolves.toEqual({
      expressWeightThresholdKg: 8,
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/config/booking');
    expect(init.method).toBe('GET');
  });

  it('pages listOrders by status with a limit and a before cursor', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await client.listOrders('BOOKED', undefined, 50, 'ord-50');
    expect(fetchFn.mock.calls[0][0]).toBe(
      'http://api.test/orders?status=BOOKED&limit=50&before=ord-50',
    );
  });

  it('reads the payout totals from GET /admin/remittance/summary', async () => {
    const summary = {
      pending: { count: 2, totalPhp: '145.50' },
      paid: { count: 5, totalPhp: '900.00' },
    };
    const fetchFn = jest.fn().mockResolvedValue(res(200, summary));
    const client = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: tokensFrom(['t']),
      fetchFn,
    });
    await expect(client.getRemittanceSummary()).resolves.toEqual(summary);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/admin/remittance/summary');
    expect(init.method).toBe('GET');
  });

  describe('shop wizard endpoints', () => {
    const make = (body: unknown) => {
      const fetchFn = jest.fn().mockResolvedValue(res(200, body));
      const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
      return { client, fetchFn };
    };

    it('reads GET /uploads/status', async () => {
      const { client, fetchFn } = make({ configured: false });
      await expect(client.uploadsStatus()).resolves.toEqual({ configured: false });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/uploads/status');
      expect(init.method).toBe('GET');
    });

    it('reads the catalog from GET /shop/catalog', async () => {
      const items = [{ id: 'c1', code: 'WDF', name: 'Wash, dry & fold', billingUnit: 'PER_KG' }];
      const { client, fetchFn } = make(items);
      await expect(client.shopCatalog()).resolves.toEqual(items);
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/catalog');
      expect(init.method).toBe('GET');
    });

    it('reads the shop rates from GET /shop/services', async () => {
      const { client, fetchFn } = make([]);
      await client.shopServices();
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/services');
      expect(init.method).toBe('GET');
    });

    it('puts a rate to PUT /shop/services/:serviceId with active always in the body', async () => {
      const { client, fetchFn } = make({ id: 's1' });
      await client.putShopService('cat/1', { ratePhp: 25, turnaroundHours: 24, active: false });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/services/cat%2F1');
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ ratePhp: 25, turnaroundHours: 24, active: false });
    });

    it('patches the wizard fields on PATCH /shop/onboarding', async () => {
      const { client, fetchFn } = make({ id: 'shop1' });
      const hours = ([0, 1, 2, 3, 4, 5, 6] as const).map((day) => ({ day, open: null, close: null }));
      await client.updateShopOnboarding({
        contactPhone: '09171234567',
        description: 'Near the plaza',
        hours,
        expressSlotsPerDay: 6,
      });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/onboarding');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({
        contactPhone: '09171234567',
        description: 'Near the plaza',
        hours,
        expressSlotsPerDay: 6,
      });
    });
  });

  it('reads the shop pending payout total', async () => {
    const body = { totalPhp: '264.00', lineCount: 2, oldestLineAt: null };
    const fetchFn = jest.fn().mockResolvedValue(res(200, body));
    const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
    await expect(client.shopRemittancePending()).resolves.toEqual(body);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://api.test/shop/remittance/pending');
    expect(init.method).toBe('GET');
  });

  it('reads one shop payout batch with its lines, id encoded', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 'b/1', lines: [] }));
    const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
    const out = await client.shopRemittanceBatch('b/1');
    expect(out.lines).toEqual([]);
    expect(fetchFn.mock.calls[0][0]).toBe('http://api.test/shop/remittance/batches/b%2F1');
  });

  describe('shop self-management endpoints', () => {
    const make = (status: number, body?: unknown) => {
      const fetchFn = jest.fn().mockResolvedValue(res(status, body));
      const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
      return { client, fetchFn };
    };
    const call = (fetchFn: jest.Mock) => {
      const [url, init] = fetchFn.mock.calls[0];
      return { url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined };
    };

    it('reads and patches the profile on /shop/me', async () => {
      const a = make(200, { id: 's1', myRole: 'OWNER' });
      await expect(a.client.shopMe()).resolves.toEqual({ id: 's1', myRole: 'OWNER' });
      expect(call(a.fetchFn)).toEqual({ url: 'http://api.test/shop/me', method: 'GET', body: undefined });
      const b = make(200, { id: 's1' });
      await b.client.updateShopMe({ contactPhone: '09171234567', expressSlotsPerDay: 8 });
      expect(call(b.fetchFn)).toEqual({
        url: 'http://api.test/shop/me',
        method: 'PATCH',
        body: { contactPhone: '09171234567', expressSlotsPerDay: 8 },
      });
    });

    it('puts and deletes the payout account', async () => {
      const a = make(200, { method: 'GCASH', accountNumberMasked: '•••• 4567' });
      await a.client.putPayoutAccount({ method: 'GCASH', accountName: 'R. Fernandez', accountNumber: '09171234567' });
      expect(call(a.fetchFn)).toEqual({
        url: 'http://api.test/shop/payout-account',
        method: 'PUT',
        body: { method: 'GCASH', accountName: 'R. Fernandez', accountNumber: '09171234567' },
      });
      const b = make(204);
      await expect(b.client.deletePayoutAccount()).resolves.toBeUndefined();
      expect(call(b.fetchFn)).toMatchObject({ url: 'http://api.test/shop/payout-account', method: 'DELETE' });
    });

    it('lists and removes members', async () => {
      const a = make(200, []);
      await a.client.shopMembers();
      expect(call(a.fetchFn)).toMatchObject({ url: 'http://api.test/shop/members', method: 'GET' });
      const b = make(204);
      await b.client.removeStaffMember('m/1');
      expect(call(b.fetchFn)).toMatchObject({ url: 'http://api.test/shop/members/m%2F1', method: 'DELETE' });
    });

    it('lists, creates and revokes invites', async () => {
      const a = make(200, []);
      await a.client.shopInvites();
      expect(call(a.fetchFn)).toMatchObject({ url: 'http://api.test/shop/invites', method: 'GET' });
      const b = make(201, { id: 'i1', email: 'ana@example.ph', createdAt: 'x' });
      await b.client.createShopInvite('ana@example.ph');
      expect(call(b.fetchFn)).toEqual({ url: 'http://api.test/shop/invites', method: 'POST', body: { email: 'ana@example.ph' } });
      const c = make(204);
      await c.client.revokeShopInvite('i1');
      expect(call(c.fetchFn)).toMatchObject({ url: 'http://api.test/shop/invites/i1', method: 'DELETE' });
    });

    it('surfaces the invite 409 with its status', async () => {
      const { client } = make(409, { message: 'That email already has an open invite' });
      await expect(client.createShopInvite('ana@example.ph')).rejects.toMatchObject({ status: 409 });
    });

    it('reads pending invites and accepts one with no body', async () => {
      const a = make(200, [{ id: 'i1', shopName: 'Hub', invitedByName: 'Lorna', createdAt: 'x' }]);
      await a.client.pendingInvites();
      expect(call(a.fetchFn)).toMatchObject({ url: 'http://api.test/shop/invites/pending', method: 'GET' });
      const b = make(200, { id: 'm1', shopId: 's1', shopName: 'Hub', role: 'STAFF' });
      await expect(b.client.acceptInvite('i1')).resolves.toMatchObject({ shopId: 's1' });
      expect(call(b.fetchFn)).toEqual({ url: 'http://api.test/shop/invites/i1/accept', method: 'POST', body: undefined });
      expect(b.fetchFn.mock.calls[0][1].headers['content-type']).toBeUndefined();
    });
  });

  it('lists every active order in one page, with search and a limit', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(200, []));
    const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
    await client.listActiveOrders();
    expect(fetchFn.mock.calls[0][0]).toBe('http://api.test/orders?active=true');
    await client.listActiveOrders('0147', 200);
    expect(fetchFn.mock.calls[1][0]).toBe('http://api.test/orders?active=true&q=0147&limit=200');
  });

  describe('shop logo fields (B8)', () => {
    const make = () => {
      const fetchFn = jest.fn().mockResolvedValue(res(200, { id: 's1', logoKey: null, logoUrl: null }));
      const client = new ApiClient({ baseUrl: 'http://api.test', tokens: tokensFrom(['t']), fetchFn });
      return { client, fetchFn };
    };

    it('sets a logo key on PATCH /shop/me', async () => {
      const { client, fetchFn } = make();
      await client.updateShopMe({ logoKey: 'uploads/u1/logo.png' });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/me');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({ logoKey: 'uploads/u1/logo.png' });
    });

    it('clears the logo with an explicit null (not an omitted key)', async () => {
      const { client, fetchFn } = make();
      await client.updateShopMe({ logoKey: null });
      expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ logoKey: null });
    });

    it('sends the logo key on PATCH /shop/onboarding during the wizard', async () => {
      const { client, fetchFn } = make();
      await client.updateShopOnboarding({ logoKey: 'uploads/u1/logo.webp' });
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('http://api.test/shop/onboarding');
      expect(JSON.parse(init.body)).toEqual({ logoKey: 'uploads/u1/logo.webp' });
    });
  });
});
