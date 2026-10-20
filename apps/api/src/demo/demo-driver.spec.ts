import {
  authHeaders,
  driverUsesFirebase,
  findOrderByCode,
  parseDriverArgs,
  remainingDriverSteps,
  signInWithPassword,
} from './demo-driver';

describe('parseDriverArgs', () => {
  it('defaults: 20 s steps, waits, a generated run id', () => {
    const a = parseDriverArgs([], () => 'gen-1');
    expect(a).toEqual({ runId: 'gen-1', stepSeconds: 20, wait: true, riderOnly: null });
  });

  it('flags', () => {
    expect(
      parseDriverArgs(['--run', 'pitch', '--step-seconds', '5', '--no-wait'], () => 'x'),
    ).toEqual({ runId: 'pitch', stepSeconds: 5, wait: false, riderOnly: null });
    expect(parseDriverArgs(['--rider-only', 'WG-2026-000123'], () => 'x').riderOnly).toBe(
      'WG-2026-000123',
    );
    expect(parseDriverArgs(['--step-seconds=7'], () => 'x').stepSeconds).toBe(7);
  });

  it.each([['--step-seconds', '-1'], ['--step-seconds', 'abc'], ['--bogus'], ['--run']])(
    'rejects %p',
    (...argv) => {
      expect(() => parseDriverArgs(argv, () => 'x')).toThrow();
    },
  );
});

describe('remainingDriverSteps', () => {
  it.each([
    ['BOOKED', ['ASSIGN', 'PICKED_UP', 'AT_SHOP']],
    ['ASSIGNED', ['PICKED_UP', 'AT_SHOP']],
    ['PICKED_UP', ['AT_SHOP']],
    ['AT_SHOP', []],
    ['PROCESSING', []],
    ['DELIVERED', []],
  ])('from %s → %p', (status, steps) => {
    expect(remainingDriverSteps(status)).toEqual(steps);
  });
});

describe('authHeaders (Firebase-less fallback)', () => {
  it('dev stub: x-dev-uid, never a bearer', () => {
    expect(authHeaders({ kind: 'dev', uid: 'demo-rider' })).toEqual({ 'x-dev-uid': 'demo-rider' });
  });

  it('firebase: a bearer token', () => {
    expect(authHeaders({ kind: 'token', idToken: 'tok' })).toEqual({ authorization: 'Bearer tok' });
  });
});

describe('driverUsesFirebase (same opt-in as the seed)', () => {
  const full = { FIREBASE_WEB_API_KEY: 'k', DEMO_PASSWORD: 'p' };
  it.each([
    [{}, false],
    [full, false], // key + password alone is not enough
    [{ ...full, DEMO_FIREBASE: '0' }, false],
    [{ DEMO_FIREBASE: '1' }, false],
    [{ DEMO_FIREBASE: '1', FIREBASE_WEB_API_KEY: 'k' }, false],
    [{ ...full, DEMO_FIREBASE: '1' }, true],
  ])('%p → %p', (env, ok) => {
    expect(driverUsesFirebase(env)).toBe(ok);
  });
});

describe('findOrderByCode (--rider-only)', () => {
  const orders = [
    { code: 'WG-2026-000123', status: 'AT_SHOP' },
    { code: 'WG-2026-000124', status: 'BOOKED' },
  ];
  it('finds the exact code', () => {
    expect(findOrderByCode(orders, 'WG-2026-000124')).toEqual(orders[1]);
  });
  it.each(['WG-NOPE', 'WG-2026-00012', '', 'wg-2026-000123'])('unknown code %p → null', (code) => {
    expect(findOrderByCode(orders, code)).toBeNull();
  });
});

describe('signInWithPassword (Firebase REST)', () => {
  const PASSWORD = 'S3cret-demo-pw';
  const TOKEN = 'eyJ.token.value';
  const ok = (body: unknown, status = 200) =>
    jest.fn(async () => ({
      ok: status < 400,
      status,
      json: async () => body,
    })) as unknown as typeof fetch;

  it('posts email + password + returnSecureToken to the key’s URL and returns the idToken', async () => {
    const f = ok({ idToken: TOKEN });
    await expect(signInWithPassword(f, 'web-key', 'a@x.ph', PASSWORD)).resolves.toBe(TOKEN);
    const [url, init] = (f as unknown as jest.Mock).mock.calls[0];
    expect(url).toBe(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=web-key',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@x.ph',
      password: PASSWORD,
      returnSecureToken: true,
    });
  });

  it('URL-encodes the key', async () => {
    const f = ok({ idToken: TOKEN });
    await signInWithPassword(f, 'a b&c', 'a@x.ph', PASSWORD);
    expect((f as unknown as jest.Mock).mock.calls[0][0]).toMatch(/key=a%20b%26c$/);
  });

  it.each([
    [{ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, 400, /a@x\.ph: wrong email or password/],
    [{ error: { message: 'USER_DISABLED' } }, 400, /a@x\.ph: account disabled/],
    [{ error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER : wait' } }, 400, /too many attempts/],
    [{ error: { message: `weird ${PASSWORD} ${TOKEN}` } }, 400, /sign-in failed \(HTTP 400\)/],
    [{}, 500, /sign-in failed \(HTTP 500\)/],
    [{ ok: true }, 200, /no idToken/],
  ])('maps %p (HTTP %p) without leaking secrets', async (body, status, msg) => {
    const f = ok(body, status);
    const err = await signInWithPassword(f, 'web-key', 'a@x.ph', PASSWORD).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(msg);
    expect((err as Error).message).not.toContain(PASSWORD);
    expect((err as Error).message).not.toContain(TOKEN);
  });

  it('a network failure is reported without the password', async () => {
    const f = jest.fn(async () => {
      throw new Error(`connect ECONNREFUSED ${PASSWORD}`);
    }) as unknown as typeof fetch;
    const err = await signInWithPassword(f, 'k', 'a@x.ph', PASSWORD).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/a@x\.ph: Firebase sign-in unreachable/);
    expect((err as Error).message).not.toContain(PASSWORD);
  });
});
