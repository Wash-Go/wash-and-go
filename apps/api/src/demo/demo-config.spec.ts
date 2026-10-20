import {
  DEMO_PREFIX,
  demoConfig,
  firebaseCredentialsPresent,
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

describe('firebaseCredentialsPresent (the Firebase-less fallback)', () => {
  it.each([
    [{}, false],
    [{ FIREBASE_SERVICE_ACCOUNT_JSON: '' }, false],
    [{ FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}' }, true],
    [{ GOOGLE_APPLICATION_CREDENTIALS: './sa.json' }, true],
    [{ GOOGLE_APPLICATION_CREDENTIALS: './sa.json', DEMO_FIREBASE: '0' }, false],
    [{ FIREBASE_SERVICE_ACCOUNT_JSON: '{}', DEMO_FIREBASE: '0' }, false],
  ])('%p → %p', (env, ok) => {
    expect(firebaseCredentialsPresent(env)).toBe(ok);
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
