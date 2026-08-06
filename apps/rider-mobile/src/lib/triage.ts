import {
  isTerminal,
  OrderStatus,
  OrderView,
  statusLabel,
} from '@wash-and-go/domain';

// Field triage: a rider scans in 2 seconds, so jobs that need their action come
// first, jobs waiting on the shop next, done/cancelled last.
export type JobGroup = 'action' | 'waiting' | 'done';

export function jobGroup(o: OrderView): JobGroup {
  if (isTerminal(o.status)) return 'done';
  return (o.availableActions?.length ?? 0) > 0 ? 'action' : 'waiting';
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
