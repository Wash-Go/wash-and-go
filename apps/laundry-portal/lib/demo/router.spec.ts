import type { OrderView } from '@wash-and-go/domain';
import { DEMO_EMAILS } from './fixture';
import { addLiveOrder, advanceOrderForTest, demoRoleFor, route, type DemoRole } from './router';
import { seedState, type DemoState } from './store';

const NOW = Date.parse('2026-10-20T06:00:00Z');

function call(s: DemoState, method: string, path: string, body?: unknown, role: DemoRole | null = 'owner', now = NOW) {
  return route(s, { method, path, body, role, now });
}
const json = <T>(r: { res: { json?: unknown } }) => r.res.json as T;

describe('auth', () => {
  it('maps the demo emails to roles, any password of 4+ characters', () => {
    expect(demoRoleFor(DEMO_EMAILS.owner, 'abcd')).toBe('owner');
    expect(demoRoleFor(' STAFF.demo@washandgo.ph ', 'abcd')).toBe('staff');
    expect(demoRoleFor(DEMO_EMAILS.owner, 'abc')).toBeNull();
    expect(demoRoleFor('someone@example.com', 'abcdef')).toBeNull();
  });

  it('needs a session', () => {
    expect(call(seedState(NOW), 'GET', '/auth/me', undefined, null).res.status).toBe(401);
  });

  it('answers /auth/me and /shop/onboarding per role', () => {
    const s = seedState(NOW);
    expect(json<{ roles: string[] }>(call(s, 'GET', '/auth/me')).roles).toEqual(['SHOP_OWNER']);
    expect(json<{ roles: string[] }>(call(s, 'GET', '/auth/me', undefined, 'staff')).roles).toEqual(['SHOP_STAFF']);
    expect(json<{ status: string }>(call(s, 'GET', '/shop/onboarding')).status).toBe('VERIFIED');
    expect(call(s, 'GET', '/shop/onboarding', undefined, 'staff').res).toEqual({ status: 200, json: null });
  });
});

describe('order lists', () => {
  const s = seedState(NOW);

  it('active=true: every non-terminal order, oldest first', () => {
    const list = json<OrderView[]>(call(s, 'GET', '/orders?active=true&limit=200'));
    expect(list).toHaveLength(7);
    expect(list.every((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))).toBe(true);
    const times = list.map((o) => Date.parse(o.createdAt));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('status filter, newest first, limit and before cursor', () => {
    const all = json<OrderView[]>(call(s, 'GET', '/orders?status=DELIVERED'));
    expect(all).toHaveLength(6);
    const page1 = json<OrderView[]>(call(s, 'GET', '/orders?status=DELIVERED&limit=4'));
    const page2 = json<OrderView[]>(call(s, 'GET', `/orders?status=DELIVERED&limit=4&before=${page1[3].id}`));
    expect(page1.map((o) => o.id).concat(page2.map((o) => o.id))).toEqual(all.map((o) => o.id));
    expect(Date.parse(all[0].createdAt)).toBeGreaterThan(Date.parse(all[5].createdAt));
  });

  it('q searches the order code, case-insensitive', () => {
    const one = json<OrderView[]>(call(s, 'GET', '/orders'))[0];
    const hit = json<OrderView[]>(call(s, 'GET', `/orders?q=${one.code.slice(-4).toLowerCase()}`));
    expect(hit.map((o) => o.id)).toEqual([one.id]);
  });

  it('rejects active with status or before, like the API', () => {
    expect(call(s, 'GET', '/orders?active=true&status=AT_SHOP').res.status).toBe(400);
    expect(call(s, 'GET', '/orders?active=true&before=x').res.status).toBe(400);
  });

  it('shapes orders like the API, with the shop actor’s next steps', () => {
    const atShop = json<OrderView[]>(call(s, 'GET', '/orders?status=AT_SHOP'))[0];
    expect(atShop.availableActions).toEqual(['PROCESSING']);
    expect(atShop.customer?.displayName).toBeTruthy();
    expect(atShop.rider?.displayName).toBe('Ana Reyes');
    expect(json<OrderView>(call(s, 'GET', `/orders/${atShop.id}`)).id).toBe(atShop.id);
    expect(call(s, 'GET', '/orders/nope').res.status).toBe(404);
  });
});

describe('weigh and transitions', () => {
  const large = (s: DemoState) => s.orders.find((o) => o.status === 'AT_SHOP' && o.loadCategory === 'L')!;

  it('preview prices kg × rate + distance delivery + service fee', () => {
    const s = seedState(NOW);
    const o = large(s);
    const b = json<Record<string, string>>(
      call(s, 'POST', '/orders/preview', { shopServiceId: o.shopServiceId, weightKg: 20, pickupLat: 6.924, pickupLng: 122.08 }),
    );
    expect(b).toMatchObject({ washValuePhp: '500.00', deliveryFeePhp: '40.00', serviceFeePhp: '7.00', customerTotalPhp: '547.00', commissionPhp: '60.00', shopRemittancePhp: '440.00' });
    expect(call(s, 'POST', '/orders/preview', { shopServiceId: 'nope', weightKg: 2 }).res.status).toBe(404);
  });

  it('weighs a Large order at 20 kg (the UI second-confirms), recomputing the bill', () => {
    const s0 = seedState(NOW);
    const { state, res } = call(s0, 'POST', `/orders/${large(s0).id}/weigh`, { weightKg: 20 });
    expect(res.status).toBe(201);
    expect((res.json as OrderView).weightKg).toBe('20');
    expect((res.json as OrderView).washValuePhp).toBe('500.00');
    expect(state.orders.find((o) => o.id === large(s0).id)!.weightKg).toBe('20');
  });

  it('enforces the 50 kg cap and the at-shop rule', () => {
    const s = seedState(NOW);
    expect(call(s, 'POST', `/orders/${large(s).id}/weigh`, { weightKg: 51 }).res.status).toBe(400);
    const ready = s.orders.find((o) => o.status === 'READY_FOR_RETURN')!;
    const r = call(s, 'POST', `/orders/${ready.id}/weigh`, { weightKg: 5 }).res;
    expect(r.status).toBe(409);
    expect((r.json as { message: string }).message).toContain('Order is not at the shop for weighing');
  });

  it('follows the status machine for the shop', () => {
    const s0 = seedState(NOW);
    const id = large(s0).id;
    const ready1 = call(s0, 'POST', `/orders/${id}/status`, { status: 'READY_FOR_RETURN' }).res;
    expect(ready1.status).toBe(409);
    const washing = call(s0, 'POST', `/orders/${id}/status`, { status: 'PROCESSING' });
    expect((washing.res.json as OrderView).status).toBe('PROCESSING');
    const noWeight = call(washing.state, 'POST', `/orders/${id}/status`, { status: 'READY_FOR_RETURN' }).res;
    expect(noWeight.status).toBe(400);
    expect((noWeight.json as { message: string }).message).toContain('Weigh this order before marking it ready');
    const deliver = call(washing.state, 'POST', `/orders/${id}/status`, { status: 'DELIVERED' }).res;
    expect(deliver.status).toBe(409);
  });

  it('staff can work the queue too', () => {
    const s = seedState(NOW);
    expect(call(s, 'POST', `/orders/${large(s).id}/status`, { status: 'PROCESSING' }, 'staff').res.status).toBe(201);
  });
});

describe('remittance', () => {
  const s = seedState(NOW);

  it('pending = the unbatched delivered payouts', () => {
    const p = json<{ totalPhp: string; lineCount: number }>(call(s, 'GET', '/shop/remittance/pending'));
    const expected = s.lines.filter((l) => l.batchId == null).reduce((a, l) => a + Number(l.payoutPhp), 0);
    expect(p.lineCount).toBe(2);
    expect(p.totalPhp).toBe(expected.toFixed(2));
  });

  it('batches list newest first; detail totals match its lines', () => {
    const list = json<{ id: string; status: string; totalPhp: string; lineCount: number }[]>(call(s, 'GET', '/shop/remittance/batches'));
    expect(list.map((b) => b.status)).toEqual(['PENDING', 'PAID']);
    for (const b of list) {
      const d = json<{ lines: { payoutPhp: string; orderCode: string }[] }>(call(s, 'GET', `/shop/remittance/batches/${b.id}`));
      expect(d.lines).toHaveLength(b.lineCount);
      expect(d.lines.reduce((a, l) => a + Number(l.payoutPhp), 0).toFixed(2)).toBe(b.totalPhp);
      expect(d.lines[0].orderCode).toMatch(/^WG-/);
    }
    expect(call(s, 'GET', '/shop/remittance/batches/nope').res.status).toBe(404);
  });

  it('a newly delivered order joins pending', () => {
    let st = addLiveOrder(seedState(NOW), NOW);
    const ready = st.orders.find((o) => o.status === 'READY_FOR_RETURN')!;
    st = advanceOrderForTest(st, ready.id, NOW);
    expect(st.orders.find((o) => o.id === ready.id)!.status).toBe('OUT_FOR_RETURN');
    st = advanceOrderForTest(st, ready.id, NOW);
    const p = json<{ lineCount: number }>(call(st, 'GET', '/shop/remittance/pending'));
    expect(p.lineCount).toBe(3);
  });
});

describe('services', () => {
  it('lists the catalog and the shop’s rates', () => {
    const s = seedState(NOW);
    expect(json<unknown[]>(call(s, 'GET', '/shop/catalog'))).toHaveLength(3);
    const rows = json<{ code: string; ratePhp: string }[]>(call(s, 'GET', '/shop/services'));
    expect(rows.map((r) => [r.code, r.ratePhp])).toEqual([
      ['WDF', '25.00'],
      ['WDF_IRON', '35.00'],
      ['DRY_CLEAN', '120.00'],
    ]);
  });

  it('PUT validates like the API and persists', () => {
    const s = seedState(NOW);
    const put = (body: unknown, role: DemoRole = 'owner') => call(s, 'PUT', '/shop/services/cat-wdf', body, role);
    expect(put({ ratePhp: 0, turnaroundHours: 24, active: true }).res.status).toBe(400);
    expect(put({ ratePhp: 100000, turnaroundHours: 24, active: true }).res.status).toBe(400);
    expect(put({ ratePhp: 25.555, turnaroundHours: 24, active: true }).res.status).toBe(400);
    expect(put({ ratePhp: 25, turnaroundHours: 721, active: true }).res.status).toBe(400);
    expect(put({ ratePhp: 25, turnaroundHours: 24, active: true }, 'staff').res.status).toBe(403);
    expect(call(s, 'PUT', '/shop/services/nope', { ratePhp: 1, turnaroundHours: 1, active: true }).res.status).toBe(404);
    const ok = put({ ratePhp: 28.5, turnaroundHours: 12, active: true });
    expect(ok.res.status).toBe(200);
    const rows = json<{ code: string; ratePhp: string; turnaroundHours: number }[]>(call(ok.state, 'GET', '/shop/services'));
    expect(rows[0]).toMatchObject({ code: 'WDF', ratePhp: '28.50', turnaroundHours: 12 });
  });
});

describe('shop profile, payout account, staff', () => {
  it('masks the payout account and validates it', () => {
    const s = seedState(NOW);
    expect(call(s, 'PUT', '/shop/payout-account', { method: 'GCASH', accountName: 'Lorna', accountNumber: '123' }).res.status).toBe(400);
    const ok = call(s, 'PUT', '/shop/payout-account', { method: 'GCASH', accountName: 'Lorna Fernandez', accountNumber: '0917 555 1234' });
    expect(ok.res.json).toMatchObject({ method: 'GCASH', accountNumberMasked: '•••• 1234', bankName: null });
    expect(JSON.stringify(call(ok.state, 'GET', '/shop/me').res.json)).not.toContain('5551234');
    expect(call(ok.state, 'PUT', '/shop/payout-account', { method: 'BANK', accountName: 'L', accountNumber: '1234567890' }).res.status).toBe(400);
    expect(call(s, 'PUT', '/shop/payout-account', { method: 'GCASH', accountName: 'x', accountNumber: '09175551234' }, 'staff').res.status).toBe(403);
    expect(call(ok.state, 'DELETE', '/shop/payout-account').res.status).toBe(204);
  });

  it('patches the profile (owner only)', () => {
    const s = seedState(NOW);
    const r = call(s, 'PATCH', '/shop/me', { description: 'New words', expressSlotsPerDay: 12 });
    expect(r.res.json).toMatchObject({ description: 'New words', expressSlotsPerDay: 12, myRole: 'OWNER' });
    expect(call(s, 'PATCH', '/shop/me', { name: 'x' }, 'staff').res.status).toBe(403);
    expect(json<{ myRole: string }>(call(s, 'GET', '/shop/me', undefined, 'staff')).myRole).toBe('STAFF');
  });

  it('invites, revokes and removes staff', () => {
    let s = seedState(NOW);
    expect(json<unknown[]>(call(s, 'GET', '/shop/members'))).toHaveLength(2);
    const inv = call(s, 'POST', '/shop/invites', { email: 'New.Person@Example.com' });
    expect(inv.res.status).toBe(201);
    s = inv.state;
    expect(json<{ email: string }[]>(call(s, 'GET', '/shop/invites'))[0].email).toBe('new.person@example.com');
    expect(call(s, 'POST', '/shop/invites', { email: 'new.person@example.com' }).res.status).toBe(409);
    expect(call(s, 'POST', '/shop/invites', { email: DEMO_EMAILS.staff }).res.status).toBe(409);
    s = call(s, 'DELETE', `/shop/invites/${(inv.res.json as { id: string }).id}`).state;
    expect(json<unknown[]>(call(s, 'GET', '/shop/invites'))).toHaveLength(0);
    const staff = json<{ id: string; role: string }[]>(call(s, 'GET', '/shop/members')).find((m) => m.role === 'STAFF')!;
    const owner = json<{ id: string; role: string }[]>(call(s, 'GET', '/shop/members')).find((m) => m.role === 'OWNER')!;
    expect(call(s, 'DELETE', `/shop/members/${owner.id}`).res.status).toBe(400);
    s = call(s, 'DELETE', `/shop/members/${staff.id}`).state;
    expect(json<unknown[]>(call(s, 'GET', '/shop/members'))).toHaveLength(1);
    expect(call(s, 'GET', '/shop/invites', undefined, 'staff').res.status).toBe(403);
  });
});

describe('misc and the live order', () => {
  it('uploads are off; geocoder answers from canned places; unknown routes 404', () => {
    const s = seedState(NOW);
    expect(call(s, 'GET', '/uploads/status').res.json).toEqual({ configured: false });
    expect(json<{ label: string }[]>(call(s, 'GET', '/geocode/search?q=pilar&limit=5'))[0].label).toContain('Pilar');
    expect(json<{ label: string }>(call(s, 'GET', '/geocode/reverse?lat=6.9263&lng=122.0772')).label).toContain('Pilar');
    expect(call(s, 'GET', '/admin/users').res.status).toBe(404);
  });

  it('a live order arrives assigned, then is picked up and at the shop 15 s apart', () => {
    const s = addLiveOrder(seedState(NOW), NOW);
    const id = s.orders[s.orders.length - 1].id;
    const at = (t: number) => json<OrderView>(call(s, 'GET', `/orders/${id}`, undefined, 'owner', NOW + t)).status;
    expect(at(0)).toBe('ASSIGNED');
    expect(at(15_000)).toBe('PICKED_UP');
    expect(at(30_000)).toBe('AT_SHOP');
    const codes = s.orders.map((o) => o.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('a live order booked after a reset never reuses an id the queue has seen', () => {
    const first = addLiveOrder(seedState(NOW), NOW + 1_000);
    const reset = seedState(NOW + 5_000);
    const second = addLiveOrder(reset, NOW + 6_000);
    const a = first.orders[first.orders.length - 1];
    const b = second.orders[second.orders.length - 1];
    expect(a.code).toBe(b.code); // the code sequence restarts with the seed
    expect(a.id).not.toBe(b.id);
  });

  it('has no /demo route', () => {
    const s = seedState(NOW);
    expect(call(s, 'POST', `/demo/advance/${s.orders[0].id}`).res.status).toBe(404);
  });
});
