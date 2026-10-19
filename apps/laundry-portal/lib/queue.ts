import {
  loadCategory,
  ORDER_STATUSES,
  STATUS_META,
  type OrderStatus,
  type OrderView,
} from '@wash-and-go/domain';
import { formatKg } from './weigh';

// The Orders queue (plan A4, preview B2): which tab an order sits in, what its
// card says and the one primary action it offers. Pure, so the mapping is
// tested against packages/domain without React.

export type QueueTab = 'needs' | 'washing' | 'ready' | 'done';
// "incoming" = booked for this shop but not here yet: a collapsed strip above
// Needs you, with no action (the rider drives those steps).
export type QueueBucket = QueueTab | 'incoming';

export const QUEUE_TABS: { key: QueueTab; label: string }[] = [
  { key: 'needs', label: 'Needs you' },
  { key: 'washing', label: 'Washing' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Done' },
];

// Derived from the domain timeline: terminal → Done; before AT_SHOP →
// Incoming; AT_SHOP → Needs you (the shop must weigh or start the wash);
// PROCESSING → Washing; after it (ready for return, out with the rider) → Ready.
const AT_SHOP_STEP = STATUS_META.AT_SHOP.step;
const PROCESSING_STEP = STATUS_META.PROCESSING.step;

export function bucketOf(status: OrderStatus): QueueBucket {
  const m = STATUS_META[status];
  if (m.terminal) return 'done';
  if (m.step < AT_SHOP_STEP) return 'incoming';
  if (m.step === AT_SHOP_STEP) return 'needs';
  if (m.step === PROCESSING_STEP) return 'washing';
  return 'ready';
}

export const BUCKET_STATUSES: Record<QueueBucket, OrderStatus[]> = {
  incoming: [],
  needs: [],
  washing: [],
  ready: [],
  done: [],
};
for (const s of ORDER_STATUSES) BUCKET_STATUSES[bucketOf(s)].push(s);

// The list API returns no totals: each status is fetched one page at a time
// (limit 50) and counted client-side. A full page means "at least this many".
export const QUEUE_PAGE = 50;

export function countLabel(count: number, pageFull: boolean): string {
  return pageFull ? `${count}+` : String(count);
}

export type ActionIcon = 'scale' | 'shirt' | 'package';
export type PrimaryAction =
  | { kind: 'weigh'; label: 'Weigh'; icon: 'scale' }
  | { kind: 'status'; to: OrderStatus; label: string; icon: ActionIcon };

const WEIGH: PrimaryAction = { kind: 'weigh', label: 'Weigh', icon: 'scale' };

// One primary action per card (DESIGN.md). Weigh first: the API refuses
// "ready" without a weight, and the weight sets the bill. Transitions only
// when the API lists them for this actor (availableActions).
export function primaryAction(
  o: Pick<OrderView, 'status' | 'weightKg' | 'shopServiceId' | 'availableActions'>,
): PrimaryAction | null {
  const can = (to: OrderStatus) => (o.availableActions ?? []).includes(to);
  const weighable = o.shopServiceId != null;
  if (o.status === 'AT_SHOP') {
    if (o.weightKg == null && weighable) return WEIGH;
    return can('PROCESSING') ? { kind: 'status', to: 'PROCESSING', label: 'Mark washing', icon: 'shirt' } : null;
  }
  if (o.status === 'PROCESSING') {
    if (o.weightKg == null) return weighable ? WEIGH : null;
    return can('READY_FOR_RETURN')
      ? { kind: 'status', to: 'READY_FOR_RETURN', label: 'Ready for pickup', icon: 'package' }
      : null;
  }
  return null;
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export function serviceLabel(t: OrderView['serviceType']): string {
  return t === 'SCHEDULED' ? 'Scheduled' : 'Express';
}

// "Small (~3 kg)", or "~4.5 kg" with no category, or null.
export function loadLabel(o: Pick<OrderView, 'loadCategory' | 'weightEstimateKg'>): string | null {
  const cat = o.loadCategory ? loadCategory(o.loadCategory) : undefined;
  const est = o.weightEstimateKg != null ? Number(o.weightEstimateKg) : cat?.estimateKg;
  const kg = est != null && Number.isFinite(est) && est > 0 ? `~${formatKg(est)} kg` : null;
  if (cat) return kg ? `${cat.label} (${kg})` : cat.label;
  return kg;
}

// "Maria · Express · Small (~3 kg)" → "Maria · Express · Weighed 7.2 kg".
export function cardMeta(
  o: Pick<OrderView, 'customer' | 'serviceType' | 'weightKg' | 'loadCategory' | 'weightEstimateKg'>,
): string {
  const size = o.weightKg != null ? `Weighed ${formatKg(Number(o.weightKg))} kg` : loadLabel(o);
  return [firstName(o.customer?.displayName), serviceLabel(o.serviceType), size].filter(Boolean).join(' · ');
}

// Later pages appended to the polled first page, without duplicates; the
// first (fresher) copy of an order wins.
export function mergeOrders(first: OrderView[], later: OrderView[]): OrderView[] {
  const seen = new Set(first.map((o) => o.id));
  return [...first, ...later.filter((o) => !seen.has(o.id))];
}

// Browser tab title with the Needs-you count: "(3) Orders · Wash & Go".
export function badgeTitle(count: number, title: string): string {
  const base = title.replace(/^\(\d+\+?\)\s*/, '');
  return count > 0 ? `(${count}) ${base}` : base;
}

// "Ana R." for the rider line.
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// A tab mixes statuses (Ready = ready + out with the rider), so merge them
// back into one order: new first, then newest booking first (the API's order).
export function sortQueue(orders: OrderView[], isNew: (id: string) => boolean): OrderView[] {
  return [...orders].sort((a, b) => {
    const n = Number(isNew(b.id)) - Number(isNew(a.id));
    if (n) return n;
    return b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0;
  });
}
