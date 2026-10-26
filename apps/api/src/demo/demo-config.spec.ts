import {
  DEMO_PREFIX,
  demoConfig,
  firebaseMode,
  isDemoAddress,
  isDemoDisplayName,
  orderIdempotencyKey,
  resetAllowed,
} from './demo-config';

describe('demo markers', () => {
  it('the marker is the "Demo " prefix', () => {
    expect(DEMO_PREFIX).toBe('Demo ');
  });

  it.each([
    ['Demo 7 Pilar St, Tetuan', true],
    ['demo 7 Pilar St', false], // case-sensitive: the seed always writes "Demo "
    ['Demolition Ave, Tetuan', false],
    ['7 Demo St', false],
    ['', false],
  ])('isDemoAddress(%p) → %p', (a, ok) => {
    expect(isDemoAddress(a)).toBe(ok);
  });

  it('isDemoDisplayName follows the same rule', () => {
    expect(isDemoDisplayName('Demo Rider')).toBe(true);
    expect(isDemoDisplayName('Rider One')).toBe(false);
    expect(isDemoDisplayName(null)).toBe(false);
  });
});

describe('demoConfig(env)', () => {
  it('defaults', () => {
    const c = demoConfig({});
    expect(c.shopName).toBe('Wash & Go Demo Laundry');
    expect(c.emails.owner).toBe('tatelgabrielle19@gmail.com');
    expect(c.emails.staff).toBe('staff.demo@washandgo.ph');
    expect(c.emails.admin).toBe('admin.demo@washandgo.ph');
    expect(c.emails.rider).toBe('rider.demo@washandgo.ph');
    expect(c.emails.customers).toEqual([
      'customer1.demo@washandgo.ph',
      'customer2.demo@washandgo.ph',
      'customer3.demo@washandgo.ph',
      'customer4.demo@washandgo.ph',
    ]);
    expect(c.localUids).toEqual({
      owner: 'demo-owner',
      staff: 'demo-staff',
      admin: 'demo-admin',
      rider: 'demo-rider',
      customers: ['demo-customer-1', 'demo-customer-2', 'demo-customer-3', 'demo-customer-4'],
    });
  });

  it('env overrides, lowercased and trimmed', () => {
    const c = demoConfig({
      DEMO_SHOP_NAME: 'Suds Demo',
      DEMO_OWNER_EMAIL: ' CEO@Example.com ',
      DEMO_STAFF_EMAIL: 'Staff@Example.com',
      DEMO_ADMIN_EMAIL: 'Admin@Example.com',
    });
    expect(c.shopName).toBe('Suds Demo');
    expect(c.emails).toMatchObject({
      owner: 'ceo@example.com',
      staff: 'staff@example.com',
      admin: 'admin@example.com',
    });
  });
});

describe('firebaseMode (opt-in: DEMO_FIREBASE=1)', () => {
  const creds = { GOOGLE_APPLICATION_CREDENTIALS: './sa.json' };
  it.each([
    ['no flag, no creds', {}, 'off'],
    ['no flag, creds loaded from .env', creds, 'off'],
    ['DEMO_FIREBASE=0 with creds', { ...creds, DEMO_FIREBASE: '0' }, 'off'],
    ['DEMO_FIREBASE=true (not exactly 1)', { ...creds, DEMO_FIREBASE: 'true' }, 'off'],
    ['DEMO_FIREBASE=1 without creds', { DEMO_FIREBASE: '1' }, 'no-credentials'],
    [
      'DEMO_FIREBASE=1 with blank creds',
      { DEMO_FIREBASE: '1', FIREBASE_SERVICE_ACCOUNT_JSON: ' ' },
      'no-credentials',
    ],
    ['DEMO_FIREBASE=1 with a file path', { ...creds, DEMO_FIREBASE: '1' }, 'on'],
    [
      'DEMO_FIREBASE=1 with inline JSON',
      { DEMO_FIREBASE: '1', FIREBASE_SERVICE_ACCOUNT_JSON: '{}' },
      'on',
    ],
  ])('%s → %s', (_l, env, mode) => {
    expect(firebaseMode(env)).toBe(mode);
  });
});

describe('orderIdempotencyKey', () => {
  it('derives a stable key from the run id', () => {
    expect(orderIdempotencyKey('pitch-1')).toBe('demo-order-pitch-1');
    expect(orderIdempotencyKey('pitch-1')).toBe(orderIdempotencyKey('pitch-1'));
  });

  it.each(['', 'has space', 'a/b', 'x'.repeat(65)])('rejects run id %p', (id) => {
    expect(() => orderIdempotencyKey(id)).toThrow(/run id/);
  });
});

describe('resetAllowed', () => {
  it.each([
    [{ NODE_ENV: 'development' }, true],
    [{ NODE_ENV: 'test' }, true],
    [{}, true],
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'production', DEMO_RESET_CONFIRM: 'no' }, false],
    [{ NODE_ENV: 'production', DEMO_RESET_CONFIRM: 'yes' }, true],
  ])('%p → %p', (env, ok) => {
    expect(resetAllowed(env)).toBe(ok);
  });
});
