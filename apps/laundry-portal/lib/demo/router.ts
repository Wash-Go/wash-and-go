import { MAX_WEIGH_KG, normalizePhMobile, type OrderStatus } from '@wash-and-go/domain';
import { DEMO_CATALOG, DEMO_EMAILS, DEMO_PEOPLE, DEMO_PICKUPS, DEMO_PLACES, DEMO_SHOP } from './fixture';
import { codeFor, deliveryFee, price, type DemoOrder, type DemoState } from './store';

// The demo build's in-browser API (B10): a pure function from a request to a
// response and the next state, implementing exactly the endpoints the portal
// calls, with the API's status codes and human messages so the existing UI
// copy applies. No network, no Firebase.

export type DemoRole = 'owner' | 'staff';

export interface DemoRequest {
  method: string;
  path: string; // pathname + query, without the origin
  body?: unknown;
  role: DemoRole | null;
  now: number;
}

export interface DemoResponse {
  status: number;
  json?: unknown;
}

// Demo sign-in: the owner or staff email, any password of 4+ characters.
export function demoRoleFor(email: string, password: string): DemoRole | null {
  if (password.length < 4) return null;
  const e = email.trim().toLowerCase();
  if (e === DEMO_EMAILS.owner) return 'owner';
  if (e === DEMO_EMAILS.staff) return 'staff';
  return null;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ok = (json: unknown, status = 200): DemoResponse => ({ status, json });
const err = (status: number, message: string): DemoResponse => ({
  status,
  json: { statusCode: status, message },
});
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// Apply the live order's due steps (and nothing else).
function advanceScheduled(s: DemoState, now: number): boolean {
  let changed = false;
  for (const o of s.orders) {
    while (o.schedule.length && Date.parse(o.schedule[0].at) <= now) {
      const step = o.schedule.shift()!;
      o.status = step.status;
      o.events.push(step);
      changed = true;
    }
  }
  return changed;
}

// A new Express order to the demo shop: assigned now, picked up 15 s later,
// at the shop 15 s after that (the badge, chime and New ring fire).
export function addLiveOrder(state: DemoState, now: number): DemoState {
  const s = structuredClone(state);
  const n = s.seq++;
  const customer = n % DEMO_PEOPLE.customers.length;
  const pickup = DEMO_PICKUPS[customer];
  const svc = s.services.find((x) => x.serviceId === 'cat-wdf') ?? s.services[0];
  const est = 6;
  s.orders.push({
    id: `ord-live-${n}`,
    code: codeFor(n),
    status: 'ASSIGNED',
    serviceType: 'EXPRESS',
    ...pickup,
    loadCategory: 'M',
    shopServiceId: svc.id,
    customer,
    riderAssigned: true,
    weightEstimateKg: String(est),
    weightKg: null,
    scheduledPickupAt: null,
    ...price(svc.ratePhp, est, deliveryFee(s.shop, { lat: pickup.pickupLat, lng: pickup.pickupLng })),
    createdAt: iso(now),
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    ratedStars: null,
    events: [
      { status: 'BOOKED', at: iso(now) },
      { status: 'ASSIGNED', at: iso(now) },
    ],
    schedule: [
      { status: 'PICKED_UP', at: iso(now + 15_000) },
      { status: 'AT_SHOP', at: iso(now + 30_000) },
    ],
  });
  return s;
}

const SHOP_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  AT_SHOP: 'PROCESSING',
  PROCESSING: 'READY_FOR_RETURN',
};
const LEGAL: Record<OrderStatus, OrderStatus[]> = {
  BOOKED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['AT_SHOP', 'CANCELLED'],
  AT_SHOP: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_RETURN', 'CANCELLED'],
  READY_FOR_RETURN: ['OUT_FOR_RETURN', 'CANCELLED'],
  OUT_FOR_RETURN: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function orderView(s: DemoState, o: DemoOrder) {
  const { customer, riderAssigned, events, schedule, pickupLat, pickupLng, ...rest } = o;
  void events;
  void schedule;
  const c = DEMO_PEOPLE.customers[customer];
  const next = SHOP_NEXT[o.status];
  return {
    ...rest,
    pickupLat: String(pickupLat),
    pickupLng: String(pickupLng),
    shopId: DEMO_SHOP.id,
    assignedRiderId: riderAssigned ? DEMO_PEOPLE.rider.id : null,
    paidCashAt: o.deliveredAt,
    shop: { id: DEMO_SHOP.id, name: s.shop.name, address: s.shop.address },
    customer: { id: c.id, displayName: c.name, phone: null },
    rider: riderAssigned ? { id: DEMO_PEOPLE.rider.id, displayName: DEMO_PEOPLE.rider.name } : null,
    availableActions: next ? [next] : [],
  };
}

function ownerShopView(s: DemoState) {
  return {
    id: DEMO_SHOP.id,
    name: s.shop.name,
    address: s.shop.address,
    lat: String(s.shop.lat),
    lng: String(s.shop.lng),
    status: 'VERIFIED',
    rejectionReason: null,
    permitKey: null,
    photoKeys: [],
    submittedAt: s.shop.verifiedAt,
    verifiedAt: s.shop.verifiedAt,
    contactPhone: s.shop.contactPhone,
    description: s.shop.description,
    hours: s.shop.hours,
    expressSlotsPerDay: s.shop.expressSlotsPerDay,
    documentsPending: true,
    logoKey: null,
    logoUrl: null,
  };
}

function payoutView(s: DemoState) {
  const p = s.shop.payout;
  if (!p) return null;
  return {
    method: p.method,
    accountName: p.accountName,
    accountNumberMasked: `•••• ${p.accountNumber.slice(-4)}`,
    bankName: p.bankName,
    updatedAt: p.updatedAt,
  };
}

function shopProfile(s: DemoState, role: DemoRole) {
  const { status, verifiedAt, ...v } = ownerShopView(s);
  return {
    id: v.id,
    name: v.name,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    contactPhone: v.contactPhone,
    description: v.description,
    hours: v.hours,
    expressSlotsPerDay: v.expressSlotsPerDay,
    status,
    verifiedAt,
    payoutAccount: payoutView(s),
    myRole: role === 'owner' ? 'OWNER' : 'STAFF',
    logoKey: null,
    logoUrl: null,
  };
}

function batchView(s: DemoState, b: DemoState['batches'][number]) {
  const lines = s.lines.filter((l) => l.batchId === b.id);
  return {
    id: b.id,
    shopId: DEMO_SHOP.id,
    shopName: s.shop.name,
    periodStart: b.periodStart,
    periodEnd: b.periodEnd,
    totalPhp: money(lines.reduce((a, l) => a + Number(l.payoutPhp), 0)),
    lineCount: lines.length,
    status: b.status,
    reference: b.reference,
    paidAt: b.paidAt,
    paidByUid: null,
    createdAt: b.createdAt,
  };
}

function person(userId: string) {
  if (userId === DEMO_PEOPLE.owner.id) return DEMO_PEOPLE.owner;
  return DEMO_PEOPLE.staff;
}

function newestFirst(a: DemoOrder, b: DemoOrder) {
  return b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : b.id < a.id ? -1 : 1;
}

function listOrders(s: DemoState, q: URLSearchParams): DemoResponse {
  const active = q.get('active') === 'true';
  const status = q.get('status');
  const search = (q.get('q') ?? '').trim().toLowerCase();
  const before = q.get('before');
  if (active && status) return err(400, 'Use either active or status, not both');
  if (active && before) return err(400, 'active lists one page; it takes no cursor');
  const lim = Number(q.get('limit'));
  const limit = Number.isFinite(lim) && lim > 0 ? Math.min(lim, active ? 500 : 100) : active ? 200 : 50;
  let list = s.orders.filter((o) => {
    if (active && (o.status === 'DELIVERED' || o.status === 'CANCELLED')) return false;
    if (status && o.status !== status) return false;
    return !search || o.code.toLowerCase().includes(search);
  });
  list.sort(newestFirst);
  if (active) list.reverse();
  if (before) {
    const i = list.findIndex((o) => o.id === before);
    list = i < 0 ? [] : list.slice(i + 1);
  }
  return ok(list.slice(0, limit).map((o) => orderView(s, o)));
}

function forbidden(role: DemoRole, need: 'owner'): DemoResponse | null {
  return role === need ? null : err(403, 'Insufficient role');
}

function deliver(s: DemoState, o: DemoOrder, now: number) {
  o.deliveredAt = iso(now);
  s.lines.push({
    id: `line-${o.id}`,
    orderId: o.id,
    batchId: null,
    washValuePhp: o.washValuePhp,
    commissionPhp: o.commissionPhp,
    payoutPhp: o.shopRemittancePhp,
    createdAt: iso(now),
  });
}

type Body = Record<string, unknown>;

function handle(s: DemoState, req: DemoRequest & { role: DemoRole }): DemoResponse {
  const url = new URL(req.path, 'http://demo.local');
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method.toUpperCase();
  const body = (req.body ?? {}) as Body;
  const { role, now } = req;
  const seg = p.split('/').filter(Boolean).map(decodeURIComponent);
  const me = role === 'owner' ? DEMO_PEOPLE.owner : DEMO_PEOPLE.staff;

  // --- auth ---
  if (p === '/auth/session' && m === 'POST') return ok({ id: me.id, roles: [role === 'owner' ? 'SHOP_OWNER' : 'SHOP_STAFF'] }, 201);
  if (p === '/auth/me' && (m === 'GET' || m === 'PATCH')) {
    return ok({
      id: me.id,
      phone: null,
      displayName: me.name,
      roles: [role === 'owner' ? 'SHOP_OWNER' : 'SHOP_STAFF'],
      emailVerified: true,
      inviteEmailOnFile: false,
    });
  }

  // --- shop ---
  if (p === '/shop/onboarding' && m === 'GET') return ok(role === 'owner' ? ownerShopView(s) : null);
  if (seg[0] === 'shop' && seg[1] === 'onboarding') return err(409, 'This shop is already verified');
  if (p === '/shop/me' && m === 'GET') return ok(shopProfile(s, role));
  if (p === '/shop/me' && m === 'PATCH') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    if (typeof body.name === 'string') {
      if (!body.name.trim() || body.name.length > 120) return err(400, 'Enter a shop name (up to 120 characters)');
      s.shop.name = body.name.trim();
    }
    if (typeof body.address === 'string') s.shop.address = body.address.trim();
    if (typeof body.lat === 'number') s.shop.lat = body.lat;
    if (typeof body.lng === 'number') s.shop.lng = body.lng;
    if (typeof body.contactPhone === 'string') {
      const n = normalizePhMobile(body.contactPhone);
      if (!n) return err(400, 'Enter a PH mobile number, e.g. 0917 123 4567');
      s.shop.contactPhone = n;
    }
    if (typeof body.description === 'string') s.shop.description = body.description.trim() || null;
    if (Array.isArray(body.hours)) s.shop.hours = body.hours as DemoState['shop']['hours'];
    if (typeof body.expressSlotsPerDay === 'number') {
      if (body.expressSlotsPerDay < 0 || body.expressSlotsPerDay > 50) return err(400, 'Express slots must be 0 to 50');
      s.shop.expressSlotsPerDay = body.expressSlotsPerDay;
    }
    return ok(shopProfile(s, role));
  }
  if (p === '/shop/payout-account') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    if (m === 'DELETE') {
      s.shop.payout = null;
      return { status: 204 };
    }
    if (m === 'PUT') {
      const name = String(body.accountName ?? '').trim();
      if (!name) return err(400, 'Enter the account holder’s name');
      const raw = String(body.accountNumber ?? '');
      if (body.method === 'GCASH') {
        if (body.bankName) return err(400, 'A GCash account has no bank name');
        const n = normalizePhMobile(raw);
        if (!n) return err(400, 'Enter the GCash mobile number, e.g. 0917 123 4567');
        s.shop.payout = { method: 'GCASH', accountName: name, accountNumber: n, bankName: null, updatedAt: iso(now) };
      } else if (body.method === 'BANK') {
        const digits = raw.replace(/[\s-]/g, '');
        if (!/^\d{6,20}$/.test(digits)) return err(400, 'A bank account number is 6 to 20 digits');
        const bank = String(body.bankName ?? '').trim();
        if (!bank) return err(400, 'Enter the bank name');
        s.shop.payout = { method: 'BANK', accountName: name, accountNumber: digits, bankName: bank, updatedAt: iso(now) };
      } else {
        return err(400, 'Choose GCash or a bank account');
      }
      return ok(payoutView(s));
    }
  }
  if (p === '/shop/catalog' && m === 'GET') return ok(DEMO_CATALOG);
  if (p === '/shop/services' && m === 'GET') {
    return ok(
      s.services.map((x) => {
        const c = DEMO_CATALOG.find((k) => k.id === x.serviceId)!;
        return { id: x.id, serviceId: x.serviceId, code: c.code, name: c.name, billingUnit: c.billingUnit, ratePhp: money(x.ratePhp), turnaroundHours: x.turnaroundHours, active: x.active };
      }),
    );
  }
  if (seg[0] === 'shop' && seg[1] === 'services' && seg[2] && m === 'PUT') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    const cat = DEMO_CATALOG.find((k) => k.id === seg[2]);
    if (!cat) return err(404, 'Unknown catalog service');
    const rate = body.ratePhp;
    const hours = body.turnaroundHours;
    const msgs: string[] = [];
    if (typeof rate !== 'number' || !(rate > 0)) msgs.push('ratePhp must be a positive number');
    else if (rate > 99999) msgs.push('ratePhp must not be greater than 99999');
    else if (Math.round(rate * 100) !== rate * 100) msgs.push('ratePhp must have at most 2 decimal places');
    if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < 1 || hours > 720) {
      msgs.push('turnaroundHours must be a whole number from 1 to 720');
    }
    if (typeof body.active !== 'boolean') msgs.push('active must be a boolean value');
    if (msgs.length) return { status: 400, json: { statusCode: 400, message: msgs } };
    const row = s.services.find((x) => x.serviceId === cat.id);
    if (row) Object.assign(row, { ratePhp: rate, turnaroundHours: hours, active: body.active });
    else s.services.push({ id: `svc-${cat.id}`, serviceId: cat.id, ratePhp: rate as number, turnaroundHours: hours as number, active: body.active as boolean });
    const saved = s.services.find((x) => x.serviceId === cat.id)!;
    return ok({ id: saved.id, serviceId: cat.id, code: cat.code, name: cat.name, billingUnit: cat.billingUnit, ratePhp: money(saved.ratePhp), turnaroundHours: saved.turnaroundHours, active: saved.active });
  }
  if (p === '/shop/members' && m === 'GET') {
    return ok(
      s.members.map((x) => {
        const who = person(x.userId);
        return { id: x.id, userId: x.userId, role: x.role, name: who.name, email: who.email, joinedAt: x.joinedAt };
      }),
    );
  }
  if (seg[0] === 'shop' && seg[1] === 'members' && seg[2] && m === 'DELETE') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    const target = s.members.find((x) => x.id === seg[2]);
    if (!target) return err(404, 'Member not found');
    if (target.userId === DEMO_PEOPLE.owner.id) return err(400, 'You can’t remove yourself');
    s.members = s.members.filter((x) => x.id !== target.id);
    return { status: 204 };
  }
  if (p === '/shop/invites/pending' && m === 'GET') return ok([]);
  if (seg[0] === 'shop' && seg[1] === 'invites' && seg[3] === 'accept') return err(404, 'Invite not found');
  if (p === '/shop/invites') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    if (m === 'GET') return ok(s.invites);
    if (m === 'POST') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, 'email must be an email');
      const memberEmails = s.members.map((x) => person(x.userId).email.toLowerCase());
      if (memberEmails.includes(email)) return err(409, 'That person is already on your team');
      if (s.invites.some((i) => i.email === email)) return err(409, 'That email already has an open invite');
      if (s.invites.length >= 20) return err(400, 'You can have at most 20 open invites — revoke one first');
      const inv = { id: `inv-${now}-${s.invites.length}`, email, createdAt: iso(now) };
      s.invites.unshift(inv);
      return ok(inv, 201);
    }
  }
  if (seg[0] === 'shop' && seg[1] === 'invites' && seg[2] && m === 'DELETE') {
    const f = forbidden(role, 'owner');
    if (f) return f;
    if (!s.invites.some((i) => i.id === seg[2])) return err(404, 'Open invite not found');
    s.invites = s.invites.filter((i) => i.id !== seg[2]);
    return { status: 204 };
  }

  // --- payouts ---
  if (p === '/shop/remittance/pending' && m === 'GET') {
    const open = s.lines.filter((l) => l.batchId == null);
    const oldest = open.map((l) => l.createdAt).sort()[0] ?? null;
    return ok({ totalPhp: money(open.reduce((a, l) => a + Number(l.payoutPhp), 0)), lineCount: open.length, oldestLineAt: oldest });
  }
  if (p === '/shop/remittance/batches' && m === 'GET') {
    return ok([...s.batches].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((b) => batchView(s, b)));
  }
  if (seg[0] === 'shop' && seg[1] === 'remittance' && seg[2] === 'batches' && seg[3] && m === 'GET') {
    const b = s.batches.find((x) => x.id === seg[3]);
    if (!b) return err(404, 'Batch not found');
    const lines = s.lines
      .filter((l) => l.batchId === b.id)
      .sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))
      .map((l) => {
        const o = s.orders.find((x) => x.id === l.orderId);
        return { ...l, orderCode: o?.code ?? '', deliveredAt: o?.deliveredAt ?? null };
      })
      .map(({ batchId, ...l }) => (void batchId, l));
    return ok({ ...batchView(s, b), lines });
  }

  // --- orders ---
  if (p === '/orders' && m === 'GET') return listOrders(s, url.searchParams);
  if (p === '/orders/preview' && m === 'POST') {
    const svc = s.services.find((x) => x.id === body.shopServiceId);
    if (!svc) return err(404, 'Shop service not found');
    const kg = Number(body.weightKg);
    if (!(kg > 0) || kg > MAX_WEIGH_KG) return err(400, `Enter a weight above 0 kg and no more than ${MAX_WEIGH_KG} kg.`);
    const pin = typeof body.pickupLat === 'number' && typeof body.pickupLng === 'number' ? { lat: body.pickupLat, lng: body.pickupLng } : null;
    return ok(price(svc.ratePhp, kg, deliveryFee(s.shop, pin)), 201);
  }
  if (seg[0] === 'orders' && seg[1]) {
    const o = s.orders.find((x) => x.id === seg[1]);
    if (!o) return err(404, 'Order not found');
    if (!seg[2] && m === 'GET') return ok(orderView(s, o));
    if (seg[2] === 'weigh' && m === 'POST') {
      if (o.status !== 'AT_SHOP' && o.status !== 'PROCESSING') return err(409, 'Order is not at the shop for weighing');
      const kg = Number(body.weightKg);
      if (!(kg > 0) || kg > MAX_WEIGH_KG) return err(400, `Enter a weight above 0 kg and no more than ${MAX_WEIGH_KG} kg.`);
      const svc = s.services.find((x) => x.id === o.shopServiceId)!;
      o.weightKg = String(Number(kg.toFixed(2)));
      Object.assign(o, price(svc.ratePhp, kg, Number(o.deliveryFeePhp)));
      return ok(orderView(s, o), 201);
    }
    if (seg[2] === 'status' && m === 'POST') {
      const to = body.status as OrderStatus;
      if (!LEGAL[o.status].includes(to)) return err(409, `Illegal transition ${o.status} → ${to}`);
      if (SHOP_NEXT[o.status] !== to) return err(403, `Your role cannot drive ${o.status} → ${to}`);
      if (to === 'READY_FOR_RETURN' && o.weightKg == null) return err(400, 'Weigh this order before marking it ready.');
      o.status = to;
      o.events.push({ status: to, at: iso(now) });
      return ok(orderView(s, o), 201);
    }
  }
  // Demo helper: move an order one step along the happy path (the rider's
  // steps the portal cannot drive), delivering it into pending payouts.
  if (seg[0] === 'demo' && seg[1] === 'advance' && seg[2] && m === 'POST') {
    const o = s.orders.find((x) => x.id === seg[2]);
    if (!o) return err(404, 'Order not found');
    const order: OrderStatus[] = ['BOOKED', 'ASSIGNED', 'PICKED_UP', 'AT_SHOP', 'PROCESSING', 'READY_FOR_RETURN', 'OUT_FOR_RETURN', 'DELIVERED'];
    const i = order.indexOf(o.status);
    if (i < 0 || i === order.length - 1) return err(409, 'Nothing to advance');
    o.status = order[i + 1];
    o.events.push({ status: o.status, at: iso(now) });
    if (o.status === 'DELIVERED') deliver(s, o, now);
    return ok(orderView(s, o), 201);
  }

  // --- misc ---
  if (p === '/uploads/status' && m === 'GET') return ok({ configured: false });
  if (seg[0] === 'uploads') return err(503, 'Uploads are not available in the demo');
  if (p === '/geocode/search' && m === 'GET') {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Number(url.searchParams.get('limit')) || 5;
    const words = q.split(/\s+/).filter(Boolean);
    return ok(DEMO_PLACES.filter((x) => words.some((w) => x.label.toLowerCase().includes(w))).slice(0, limit));
  }
  if (p === '/geocode/reverse' && m === 'GET') {
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const near = [...DEMO_PLACES].sort((a, b) => Math.hypot(a.point.lat - lat, a.point.lng - lng) - Math.hypot(b.point.lat - lat, b.point.lng - lng))[0];
    return ok({ label: near?.label ?? null });
  }
  return err(404, `Cannot ${m} ${p}`);
}

const READS = new Set(['GET', 'HEAD']);

// Route one request. Returns the next state (the same object when nothing
// changed) and the response.
export function route(state: DemoState, req: DemoRequest): { state: DemoState; res: DemoResponse } {
  if (!req.role) return { state, res: err(401, 'Not signed in') };
  const s = structuredClone(state);
  const advanced = advanceScheduled(s, req.now);
  const res = handle(s, { ...req, role: req.role });
  const write = !READS.has(req.method.toUpperCase()) && res.status < 400;
  return { state: advanced || write ? s : state, res };
}
