import type { BillingUnit, OrderStatus, ServiceType, ShopHoursDay } from '@wash-and-go/domain';

// Demo dataset (B10): hand-written mirror of the B9 API seed
// (apps/api/src/demo/demo-plan.ts, demo-seed.ts) so the standalone demo build
// shows the same shop, rates, hours and orders as the seeded demo API.
// Every person and address here is fictional. Pricing constants mirror the
// API's PlatformConfig defaults (apps/api/src/platform-config), which have no
// shared domain constant: service fee ₱7, delivery ₱40 base + ₱8/km past 2 km
// of the round trip (×1.3 road factor), capped at ₱150, commission 12%.

export const DEMO_PRICING = {
  serviceFeePhp: 7,
  deliveryBasePhp: 40,
  deliveryFreeKm: 2,
  deliveryPerKmPhp: 8,
  deliveryMaxPhp: 150,
  roadFactor: 1.3,
  commissionPct: 12,
} as const;

export const DEMO_EMAILS = {
  owner: 'demo.owner@washandgo.ph',
  staff: 'staff.demo@washandgo.ph',
} as const;

export const DEMO_SHOP = {
  id: 'demo-shop',
  name: 'Wash & Go Demo Laundry',
  address: 'Demo 12 Don Alfaro St, Tetuan, Zamboanga City',
  lat: 6.924,
  lng: 122.08,
  contactPhone: '+639170000123',
  description: 'Family-run wash, dry and fold in Tetuan. Same-day Express on small loads.',
  expressSlotsPerDay: 10,
  // Mon–Sat 08:00–18:00, closed Sunday.
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) =>
    day === 0 ? { day, open: null, close: null } : { day, open: '08:00', close: '18:00' },
  ) as ShopHoursDay[],
} as const;

export const DEMO_CATALOG: { id: string; code: string; name: string; billingUnit: BillingUnit }[] = [
  { id: 'cat-wdf', code: 'WDF', name: 'Wash, dry & fold', billingUnit: 'PER_KG' },
  { id: 'cat-wdf-iron', code: 'WDF_IRON', name: 'Wash, dry, fold & iron', billingUnit: 'PER_KG' },
  { id: 'cat-dry-clean', code: 'DRY_CLEAN', name: 'Dry clean', billingUnit: 'PER_PIECE' },
];

export const DEMO_SERVICES = [
  { id: 'svc-wdf', serviceId: 'cat-wdf', ratePhp: 25, turnaroundHours: 24 },
  { id: 'svc-wdf-iron', serviceId: 'cat-wdf-iron', ratePhp: 35, turnaroundHours: 48 },
  { id: 'svc-dry-clean', serviceId: 'cat-dry-clean', ratePhp: 120, turnaroundHours: 72 },
] as const;

export const DEMO_PEOPLE = {
  owner: { id: 'usr-demo-owner', name: 'Lorna Fernandez', email: DEMO_EMAILS.owner },
  staff: { id: 'usr-demo-staff', name: 'Dodong Ramos', email: DEMO_EMAILS.staff },
  rider: { id: 'usr-demo-rider', name: 'Ana Reyes' },
  customers: [
    { id: 'usr-demo-c1', name: 'Rhea Dela Cruz' },
    { id: 'usr-demo-c2', name: 'Jun Alvarez' },
    { id: 'usr-demo-c3', name: 'Maria Santos' },
    { id: 'usr-demo-c4', name: 'Carlo Mendoza' },
  ],
} as const;

// Zamboanga City pickups inside the pilot coverage ring (same as B9).
export const DEMO_PICKUPS = [
  { pickupAddress: 'Demo 7 Pilar St, Tetuan, Zamboanga City', pickupLat: 6.9263, pickupLng: 122.0772 },
  { pickupAddress: 'Demo 22 Don Alfaro St, Tetuan, Zamboanga City', pickupLat: 6.9231, pickupLng: 122.0838 },
  { pickupAddress: 'Demo 15 Gov. Camins Ave, Canelar, Zamboanga City', pickupLat: 6.9146, pickupLng: 122.0711 },
  { pickupAddress: 'Demo 3 Mayor Jaldon St, Zone IV, Zamboanga City', pickupLat: 6.9058, pickupLng: 122.0765 },
] as const;

export type DemoTarget = Exclude<OrderStatus, 'BOOKED' | 'OUT_FOR_RETURN'>;

export interface DemoOrderRow {
  label: string;
  customer: number;
  load: 'S' | 'M' | 'L';
  serviceCode: 'WDF' | 'WDF_IRON';
  serviceType: ServiceType;
  target: DemoTarget;
  weighKg?: number;
  hoursAgo: number;
  stepMinutes: number;
  batch: 'PAID' | 'PENDING' | null;
  rated?: number;
  cancelReason?: string;
}

// The fourteen B9 orders: 1 assigned, 1 picked up, 2 at the shop (the Large
// one trips the second confirm at 20 kg), 2 washing, 1 ready, 6 delivered
// (2 paid out, 2 in a pending batch, 2 newest unbatched; one rated 5), 1
// cancelled.
export const DEMO_ORDERS: DemoOrderRow[] = [
  { label: 'incoming-assigned', customer: 0, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'ASSIGNED', hoursAgo: 0.4, stepMinutes: 6, batch: null },
  { label: 'incoming-picked-up', customer: 1, load: 'S', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'PICKED_UP', hoursAgo: 1.2, stepMinutes: 15, batch: null },
  { label: 'needs-you-medium', customer: 2, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'AT_SHOP', hoursAgo: 3, stepMinutes: 30, batch: null },
  { label: 'needs-you-large', customer: 3, load: 'L', serviceCode: 'WDF', serviceType: 'SCHEDULED', target: 'AT_SHOP', hoursAgo: 5, stepMinutes: 45, batch: null },
  { label: 'washing-1', customer: 0, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'PROCESSING', weighKg: 6.4, hoursAgo: 9, stepMinutes: 50, batch: null },
  { label: 'washing-2', customer: 1, load: 'S', serviceCode: 'WDF_IRON', serviceType: 'EXPRESS', target: 'PROCESSING', weighKg: 4.2, hoursAgo: 20, stepMinutes: 60, batch: null },
  { label: 'ready', customer: 2, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'READY_FOR_RETURN', weighKg: 7.1, hoursAgo: 26, stepMinutes: 60, batch: null },
  { label: 'delivered-1', customer: 3, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'DELIVERED', weighKg: 5.8, hoursAgo: 70, stepMinutes: 60, batch: 'PAID' },
  { label: 'delivered-2', customer: 0, load: 'S', serviceCode: 'WDF_IRON', serviceType: 'EXPRESS', target: 'DELIVERED', weighKg: 3.5, hoursAgo: 66, stepMinutes: 60, batch: 'PAID' },
  { label: 'delivered-3', customer: 1, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'DELIVERED', weighKg: 6.0, hoursAgo: 50, stepMinutes: 60, batch: 'PENDING' },
  { label: 'delivered-4', customer: 2, load: 'L', serviceCode: 'WDF', serviceType: 'SCHEDULED', target: 'DELIVERED', weighKg: 9.6, hoursAgo: 46, stepMinutes: 60, batch: 'PENDING' },
  { label: 'delivered-5', customer: 3, load: 'M', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'DELIVERED', weighKg: 6.8, hoursAgo: 30, stepMinutes: 60, batch: null, rated: 5 },
  { label: 'delivered-6', customer: 0, load: 'S', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'DELIVERED', weighKg: 2.9, hoursAgo: 22, stepMinutes: 60, batch: null },
  { label: 'cancelled', customer: 3, load: 'S', serviceCode: 'WDF', serviceType: 'EXPRESS', target: 'CANCELLED', hoursAgo: 40, stepMinutes: 20, batch: null, cancelReason: 'Customer rescheduled' },
];

export const DEMO_PAID_REFERENCE = 'GCASH-DEMO-0001';

// Canned geocoder answers for the Location step (no TomTom in the demo).
export const DEMO_PLACES = [
  { label: 'Don Alfaro St, Tetuan, Zamboanga City', point: { lat: 6.9231, lng: 122.0838 } },
  { label: 'Pilar St, Tetuan, Zamboanga City', point: { lat: 6.9263, lng: 122.0772 } },
  { label: 'Gov. Camins Ave, Canelar, Zamboanga City', point: { lat: 6.9146, lng: 122.0711 } },
  { label: 'Mayor Jaldon St, Zone IV, Zamboanga City', point: { lat: 6.9058, lng: 122.0765 } },
  { label: 'Veterans Ave, Zamboanga City', point: { lat: 6.9112, lng: 122.0739 } },
];
