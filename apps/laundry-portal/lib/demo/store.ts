import { loadCategory, type OrderStatus, type PayoutMethod, type ServiceType, type ShopHoursDay } from '@wash-and-go/domain';
import {
  DEMO_CATALOG,
  DEMO_ORDERS,
  DEMO_PAID_REFERENCE,
  DEMO_PEOPLE,
  DEMO_PICKUPS,
  DEMO_PRICING,
  DEMO_SERVICES,
  DEMO_SHOP,
  type DemoOrderRow,
} from './fixture';

// The demo build's whole backend state (B10), kept in localStorage. Pure:
// every function takes the clock and the storage it needs.

export const DEMO_STATE_KEY = 'wg-demo-state';
export const DEMO_STATE_VERSION = 2;
// A seed older than this is replaced on load, so "booked 3 h ago" stays true
// on presentation day.
export const DEMO_STATE_MAX_AGE_MS = 24 * 3_600_000;

export interface DemoEvent {
  status: OrderStatus;
  at: string;
}

export interface DemoOrder {
  id: string;
  code: string;
  status: OrderStatus;
  serviceType: ServiceType;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  loadCategory: 'S' | 'M' | 'L';
  shopServiceId: string;
  customer: number;
  riderAssigned: boolean;
  weightEstimateKg: string | null;
  weightKg: string | null;
  scheduledPickupAt: string | null;
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  commissionPhp: string;
  shopRemittancePhp: string;
  customerTotalPhp: string;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  ratedStars: number | null;
  events: DemoEvent[];
  // Future steps the demo applies by itself (the "new order arrives" control).
  schedule: DemoEvent[];
}

export interface DemoPayout {
  method: PayoutMethod;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  updatedAt: string;
}

export interface DemoState {
  version: number;
  // When this state was seeded (ms): live-order ids and the 24 h refresh use it.
  seededAt: number;
  seq: number;
  shop: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    contactPhone: string | null;
    description: string | null;
    hours: ShopHoursDay[] | null;
    expressSlotsPerDay: number;
    verifiedAt: string;
    payout: DemoPayout | null;
  };
  services: { id: string; serviceId: string; ratePhp: number; turnaroundHours: number; active: boolean }[];
  members: { id: string; userId: string; role: 'OWNER' | 'STAFF'; joinedAt: string }[];
  invites: { id: string; email: string; createdAt: string }[];
  orders: DemoOrder[];
  batches: {
    id: string;
    periodStart: string;
    periodEnd: string;
    status: 'PENDING' | 'PAID';
    reference: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
  lines: {
    id: string;
    orderId: string;
    batchId: string | null;
    washValuePhp: string;
    commissionPhp: string;
    payoutPhp: string;
    createdAt: string;
  }[];
}

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The API's distance delivery fee (apps/api/src/pricing/distance.ts).
export function deliveryFee(shop: { lat: number; lng: number }, pickup?: { lat: number; lng: number } | null): number {
  const p = DEMO_PRICING;
  if (!pickup) return p.deliveryBasePhp;
  const roundTrip = 2 * haversineKm(shop, pickup) * p.roadFactor;
  const raw = p.deliveryBasePhp + Math.max(0, roundTrip - p.deliveryFreeKm) * p.deliveryPerKmPhp;
  return Math.min(raw, p.deliveryMaxPhp);
}

// The API's pricePreview: wash = rate × kg; commission carved out of wash;
// customer pays wash + delivery + service fee. Strings at 2dp.
export function price(ratePhp: number, kg: number, delivery: number) {
  const wash = Math.round(ratePhp * kg * 100) / 100;
  const commission = Math.round(wash * DEMO_PRICING.commissionPct) / 100;
  const service = DEMO_PRICING.serviceFeePhp;
  const del = Math.round(delivery * 100) / 100;
  return {
    washValuePhp: money(wash),
    commissionPhp: money(commission),
    shopRemittancePhp: money(wash - commission),
    deliveryFeePhp: money(del),
    serviceFeePhp: money(service),
    customerTotalPhp: money(wash + del + service),
  };
}

const FLOW: OrderStatus[] = ['BOOKED', 'ASSIGNED', 'PICKED_UP', 'AT_SHOP', 'PROCESSING', 'READY_FOR_RETURN', 'OUT_FOR_RETURN', 'DELIVERED'];

function stepsFor(row: DemoOrderRow): OrderStatus[] {
  if (row.target === 'CANCELLED') return ['BOOKED', 'CANCELLED'];
  return FLOW.slice(0, FLOW.indexOf(row.target) + 1);
}

export function codeFor(n: number): string {
  return `WG-2026-${String(n).padStart(6, '0')}`;
}

const serviceIdFor = (code: string) => DEMO_SERVICES[DEMO_CATALOG.findIndex((c) => c.code === code)].id;

export function seedState(now: number): DemoState {
  const shopPin = { lat: DEMO_SHOP.lat, lng: DEMO_SHOP.lng };
  const orders: DemoOrder[] = DEMO_ORDERS.map((row, i) => {
    const bookedAt = now - Math.round(row.hoursAgo * HOUR);
    const steps = stepsFor(row);
    const step = Math.min(row.stepMinutes * 60_000, Math.floor((now - bookedAt) / steps.length));
    const events = steps.map((status, k) => ({ status, at: iso(bookedAt + k * step) }));
    const pickup = DEMO_PICKUPS[row.customer];
    const est = loadCategory(row.load)!.estimateKg;
    const svc = DEMO_SERVICES.find((s) => s.id === serviceIdFor(row.serviceCode))!;
    const kg = row.weighKg ?? est;
    const last = events[events.length - 1].at;
    return {
      id: `ord-${row.label}`,
      code: codeFor(201 + i),
      status: row.target,
      serviceType: row.serviceType,
      ...pickup,
      loadCategory: row.load,
      shopServiceId: svc.id,
      customer: row.customer,
      riderAssigned: row.target !== 'CANCELLED',
      weightEstimateKg: String(est),
      weightKg: row.weighKg != null ? String(row.weighKg) : null,
      scheduledPickupAt: row.serviceType === 'SCHEDULED' ? iso(bookedAt + HOUR) : null,
      ...price(svc.ratePhp, kg, deliveryFee(shopPin, { lat: pickup.pickupLat, lng: pickup.pickupLng })),
      createdAt: iso(bookedAt),
      deliveredAt: row.target === 'DELIVERED' ? last : null,
      cancelledAt: row.target === 'CANCELLED' ? last : null,
      cancelReason: row.cancelReason ?? null,
      ratedStars: row.rated ?? null,
      events,
      schedule: [],
    };
  });

  const lines: DemoState['lines'] = [];
  const batches: DemoState['batches'] = [];
  for (const b of ['PAID', 'PENDING'] as const) {
    const rows = DEMO_ORDERS.map((r, i) => ({ r, o: orders[i] })).filter(({ r }) => r.batch === b);
    const ts = rows.map(({ o }) => Date.parse(o.deliveredAt!));
    const periodEnd = Math.max(...ts) + HOUR;
    batches.push({
      id: `batch-${b.toLowerCase()}`,
      periodStart: iso(Math.min(...ts) - HOUR),
      periodEnd: iso(periodEnd),
      status: b,
      reference: b === 'PAID' ? DEMO_PAID_REFERENCE : null,
      paidAt: b === 'PAID' ? iso(periodEnd + 3 * HOUR) : null,
      createdAt: iso(periodEnd + HOUR),
    });
  }
  DEMO_ORDERS.forEach((r, i) => {
    const o = orders[i];
    if (o.status !== 'DELIVERED') return;
    lines.push({
      id: `line-${r.label}`,
      orderId: o.id,
      batchId: r.batch ? `batch-${r.batch.toLowerCase()}` : null,
      washValuePhp: o.washValuePhp,
      commissionPhp: o.commissionPhp,
      payoutPhp: o.shopRemittancePhp,
      createdAt: o.deliveredAt!,
    });
  });

  const joined = iso(now - 30 * 24 * HOUR);
  return {
    version: DEMO_STATE_VERSION,
    seededAt: now,
    seq: 201 + DEMO_ORDERS.length,
    shop: {
      name: DEMO_SHOP.name,
      address: DEMO_SHOP.address,
      lat: DEMO_SHOP.lat,
      lng: DEMO_SHOP.lng,
      contactPhone: DEMO_SHOP.contactPhone,
      description: DEMO_SHOP.description,
      hours: DEMO_SHOP.hours.map((h) => ({ ...h })),
      expressSlotsPerDay: DEMO_SHOP.expressSlotsPerDay,
      verifiedAt: joined,
      payout: null,
    },
    services: DEMO_SERVICES.map((s) => ({ ...s, active: true })),
    members: [
      { id: 'mem-owner', userId: DEMO_PEOPLE.owner.id, role: 'OWNER', joinedAt: joined },
      { id: 'mem-staff', userId: DEMO_PEOPLE.staff.id, role: 'STAFF', joinedAt: iso(now - 12 * 24 * HOUR) },
    ],
    invites: [],
    orders,
    batches,
    lines,
  };
}

type Reader = { getItem: (k: string) => string | null };
type Writer = { setItem: (k: string, v: string) => void };

// The stored state, or a fresh seed (saved) when there is none, it does not
// parse, it was written by another version of the demo, or it was seeded
// more than 24 h ago.
export function loadState(storage: (Reader & Writer) | null, now: number): DemoState {
  try {
    const raw = storage?.getItem(DEMO_STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      const fresh = typeof s?.seededAt === 'number' && now - s.seededAt <= DEMO_STATE_MAX_AGE_MS;
      if (s && s.version === DEMO_STATE_VERSION && Array.isArray(s.orders) && fresh) return s;
    }
  } catch {
    // fall through to a fresh seed
  }
  const s = seedState(now);
  saveState(storage, s);
  return s;
}

export function saveState(storage: Writer | null, s: DemoState): void {
  try {
    storage?.setItem(DEMO_STATE_KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the demo still works for this page view.
  }
}
