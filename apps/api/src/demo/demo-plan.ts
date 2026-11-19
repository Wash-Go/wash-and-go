/*
 * The demo order timeline (pure). Fourteen orders spread over the last three
 * days so the queue reads naturally ("booked 25 min ago", "delivered
 * yesterday"), each with the exact event sequence the API's status machine
 * produces. The seed books and advances them through the real OrdersService,
 * then rewrites only the timestamps to these values.
 */

export type DemoTarget =
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'AT_SHOP'
  | 'PROCESSING'
  | 'READY_FOR_RETURN'
  | 'DELIVERED'
  | 'CANCELLED';

export type StepKind =
  | 'BOOKED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'AT_SHOP'
  | 'WEIGH'
  | 'PROCESSING'
  | 'READY_FOR_RETURN'
  | 'OUT_FOR_RETURN'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DemoOrderPlan {
  label: string;
  customer: number; // index into the demo customers
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  load: 'S' | 'M' | 'L';
  serviceCode: 'WDF' | 'WDF_IRON';
  serviceType: 'EXPRESS' | 'SCHEDULED';
  target: DemoTarget;
  weighKg?: number;
  bookedAt: Date;
  stepMinutes: number;
  rating?: { stars: number; comment: string };
  cancelReason?: string;
  batch: 'PAID' | 'PENDING' | null;
}

export const DEMO_ORDER_PLAN_COUNTS: Record<DemoTarget, number> = {
  ASSIGNED: 1,
  PICKED_UP: 1,
  AT_SHOP: 2,
  PROCESSING: 2,
  READY_FOR_RETURN: 1,
  DELIVERED: 6,
  CANCELLED: 1,
};

// Zamboanga City pickups inside the pilot coverage ring.
const PICKUPS = [
  {
    pickupAddress: 'Demo 7 Pilar St, Tetuan, Zamboanga City',
    pickupLat: 6.9263,
    pickupLng: 122.0772,
  },
  {
    pickupAddress: 'Demo 22 Don Alfaro St, Tetuan, Zamboanga City',
    pickupLat: 6.9231,
    pickupLng: 122.0838,
  },
  {
    pickupAddress: 'Demo 15 Gov. Camins Ave, Canelar, Zamboanga City',
    pickupLat: 6.9146,
    pickupLng: 122.0711,
  },
  {
    pickupAddress: 'Demo 3 Mayor Jaldon St, Zone IV, Zamboanga City',
    pickupLat: 6.9058,
    pickupLng: 122.0765,
  },
];

type Row = Omit<DemoOrderPlan, 'bookedAt' | 'pickupAddress' | 'pickupLat' | 'pickupLng'> & {
  hoursAgo: number;
};

const ROWS: Row[] = [
  // Incoming (pre-shop), booked today.
  {
    label: 'incoming-assigned',
    customer: 0,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'ASSIGNED',
    hoursAgo: 0.4,
    stepMinutes: 6,
    batch: null,
  },
  {
    label: 'incoming-picked-up',
    customer: 1,
    load: 'S',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'PICKED_UP',
    hoursAgo: 1.2,
    stepMinutes: 15,
    batch: null,
  },
  // Needs you: at the shop, unweighed.
  {
    label: 'needs-you-medium',
    customer: 2,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'AT_SHOP',
    hoursAgo: 3,
    stepMinutes: 30,
    batch: null,
  },
  {
    label: 'needs-you-large',
    customer: 3,
    load: 'L',
    serviceCode: 'WDF',
    serviceType: 'SCHEDULED',
    target: 'AT_SHOP',
    hoursAgo: 5,
    stepMinutes: 45,
    batch: null,
  },
  // Washing (weighed).
  {
    label: 'washing-1',
    customer: 0,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'PROCESSING',
    weighKg: 6.4,
    hoursAgo: 9,
    stepMinutes: 50,
    batch: null,
  },
  {
    label: 'washing-2',
    customer: 1,
    load: 'S',
    serviceCode: 'WDF_IRON',
    serviceType: 'EXPRESS',
    target: 'PROCESSING',
    weighKg: 4.2,
    hoursAgo: 20,
    stepMinutes: 60,
    batch: null,
  },
  // Ready for return.
  {
    label: 'ready',
    customer: 2,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'READY_FOR_RETURN',
    weighKg: 7.1,
    hoursAgo: 26,
    stepMinutes: 60,
    batch: null,
  },
  // Delivered: two oldest paid out, next two in a pending batch, two newest unbatched.
  {
    label: 'delivered-1',
    customer: 3,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'DELIVERED',
    weighKg: 5.8,
    hoursAgo: 70,
    stepMinutes: 60,
    batch: 'PAID',
  },
  {
    label: 'delivered-2',
    customer: 0,
    load: 'S',
    serviceCode: 'WDF_IRON',
    serviceType: 'EXPRESS',
    target: 'DELIVERED',
    weighKg: 3.5,
    hoursAgo: 66,
    stepMinutes: 60,
    batch: 'PAID',
  },
  {
    label: 'delivered-3',
    customer: 1,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'DELIVERED',
    weighKg: 6.0,
    hoursAgo: 50,
    stepMinutes: 60,
    batch: 'PENDING',
  },
  {
    label: 'delivered-4',
    customer: 2,
    load: 'L',
    serviceCode: 'WDF',
    serviceType: 'SCHEDULED',
    target: 'DELIVERED',
    weighKg: 9.6,
    hoursAgo: 46,
    stepMinutes: 60,
    batch: 'PENDING',
  },
  {
    label: 'delivered-5',
    customer: 3,
    load: 'M',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'DELIVERED',
    weighKg: 6.8,
    hoursAgo: 30,
    stepMinutes: 60,
    batch: null,
    rating: { stars: 5, comment: 'Fresh, folded neatly, and on time.' },
  },
  {
    label: 'delivered-6',
    customer: 0,
    load: 'S',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'DELIVERED',
    weighKg: 2.9,
    hoursAgo: 22,
    stepMinutes: 60,
    batch: null,
  },
  // Cancelled before pickup.
  {
    label: 'cancelled',
    customer: 3,
    load: 'S',
    serviceCode: 'WDF',
    serviceType: 'EXPRESS',
    target: 'CANCELLED',
    hoursAgo: 40,
    stepMinutes: 20,
    batch: null,
    cancelReason: 'Customer rescheduled',
  },
];

export function demoOrderPlan(now: Date): DemoOrderPlan[] {
  return ROWS.map(({ hoursAgo, ...r }) => ({
    ...r,
    ...PICKUPS[r.customer],
    bookedAt: new Date(now.getTime() - Math.round(hoursAgo * 3_600_000)),
  }));
}

const FLOW: StepKind[] = [
  'BOOKED',
  'ASSIGNED',
  'PICKED_UP',
  'AT_SHOP',
  'WEIGH',
  'PROCESSING',
  'READY_FOR_RETURN',
  'OUT_FOR_RETURN',
  'DELIVERED',
];

export function stepKinds(target: DemoTarget): StepKind[] {
  if (target === 'CANCELLED') return ['BOOKED', 'CANCELLED'];
  return FLOW.slice(0, FLOW.indexOf(target) + 1);
}

// Each step's timestamp: booked, then evenly spaced, always strictly before now.
export function eventSteps(o: DemoOrderPlan, now: Date): Array<{ kind: StepKind; at: Date }> {
  const kinds = stepKinds(o.target);
  const room = now.getTime() - o.bookedAt.getTime();
  const step = Math.min(o.stepMinutes * 60_000, Math.floor(room / kinds.length));
  return kinds.map((kind, i) => ({ kind, at: new Date(o.bookedAt.getTime() + i * step) }));
}

// The remittance periods to close: each covers exactly its batch's delivery
// times (±1 h), so the newest (unbatched) deliveries stay in "pending".
export function batchPeriods(
  plan: DemoOrderPlan[],
  now: Date,
): Record<'PAID' | 'PENDING', { periodStart: Date; periodEnd: Date }> {
  const hour = 3_600_000;
  const period = (b: 'PAID' | 'PENDING') => {
    const ts = plan
      .filter((o) => o.target === 'DELIVERED' && o.batch === b)
      .map((o) => eventSteps(o, now).at(-1)!.at.getTime());
    return {
      periodStart: new Date(Math.min(...ts) - hour),
      periodEnd: new Date(Math.max(...ts) + hour),
    };
  };
  return { PAID: period('PAID'), PENDING: period('PENDING') };
}
