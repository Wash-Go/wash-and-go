import {
  isTerminal,
  OrderStatus,
  OrderView,
  peso,
  statusLabel,
} from '@wash-and-go/domain';

// Field triage: a rider scans in 2 seconds, so jobs that need their action come
// first, jobs waiting on the shop next, done/cancelled last.
export type JobGroup = 'action' | 'waiting' | 'done';

export function jobGroup(o: OrderView): JobGroup {
  if (isTerminal(o.status)) return 'done';
  return (o.availableActions?.length ?? 0) > 0 ? 'action' : 'waiting';
}

// The Jobs header's "N active": delivered and cancelled jobs stay on the board
// (in the "done" group) but aren't active work.
export function activeJobCount(orders: Pick<OrderView, 'status'>[]): number {
  return orders.filter((o) => !isTerminal(o.status)).length;
}

const GROUP_RANK: Record<JobGroup, number> = { action: 0, waiting: 1, done: 2 };

export function sortJobs(orders: OrderView[]): OrderView[] {
  return [...orders].sort((a, b) => {
    const g = GROUP_RANK[jobGroup(a)] - GROUP_RANK[jobGroup(b)];
    if (g !== 0) return g;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}

export const GROUP_LABEL: Record<JobGroup, string> = {
  action: 'Needs action',
  waiting: 'Waiting on shop',
  done: 'Done',
};

// Rider-facing verbs for the action buttons (clearer than the raw state label).
const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  PICKED_UP: 'Mark picked up',
  AT_SHOP: 'Dropped at shop',
  OUT_FOR_RETURN: 'Out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel',
};

export function actionLabel(status: OrderStatus): string {
  return ACTION_LABEL[status] ?? statusLabel(status);
}

// Money / irreversible actions get slide-to-confirm (design D2).
export function needsConfirm(status: OrderStatus): boolean {
  return status === 'DELIVERED';
}

// Cash on delivery (U0 T2). COD is the only payment method at launch, so an
// order with a positive total is paid in cash at the door. Mirrors the API's
// rule (apps/api/src/orders/cash-on-delivery.ts): the server records the cash
// in the same write as DELIVERED, so the rider never has a second step to skip.
export function collectsCash(o: Pick<OrderView, 'customerTotalPhp'>): boolean {
  const n = Number(o.customerTotalPhp);
  return Number.isFinite(n) && n > 0;
}

// The one deliver slide: it says the cash is being collected, and how much.
export function deliverSlideLabel(
  o: Pick<OrderView, 'customerTotalPhp'>,
): string {
  return collectsCash(o)
    ? `Slide: collected ${peso(o.customerTotalPhp)} & delivered`
    : `Slide to ${actionLabel('DELIVERED').toLowerCase()}`;
}

// Legacy only: an order delivered before U0 T2 may still have no cash recorded.
// Those (and only those) keep the separate record-cash slide.
export function needsCashRecord(
  o: Pick<OrderView, 'status' | 'paidCashAt' | 'customerTotalPhp'>,
): boolean {
  return o.status === 'DELIVERED' && !o.paidCashAt && collectsCash(o);
}
