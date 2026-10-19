import { EXPRESS_TIMELINE, STATUS_META, type OrderStatus, type OrderView } from '@wash-and-go/domain';
import { bucketOf, loadLabel, shortName } from './queue';
import { formatKg } from './weigh';

// Order detail (plan A4, preview B4). Pure helpers for the trail, the weigh
// history and the payout line.

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: 'done' | 'now' | 'next';
  // ISO time, only where the order itself records one. Per-step times live
  // in OrderEvent, which GET /orders/:id does not expose yet.
  at: string | null;
}

export function orderTimeline(
  o: Pick<OrderView, 'status' | 'weightKg' | 'createdAt' | 'deliveredAt' | 'cancelledAt' | 'cancelReason' | 'rider'>,
): TimelineStep[] {
  if (o.status === 'CANCELLED') {
    return [
      { status: 'BOOKED', label: 'Booked', state: 'done', at: o.createdAt },
      {
        status: 'CANCELLED',
        label: o.cancelReason ? `Cancelled · ${o.cancelReason}` : 'Cancelled',
        state: 'now',
        at: o.cancelledAt,
      },
    ];
  }
  const cur = STATUS_META[o.status].step;
  const rider = shortName(o.rider?.displayName);
  return EXPRESS_TIMELINE.map((s) => {
    const step = STATUS_META[s].step;
    let label = STATUS_META[s].label;
    if (s === 'AT_SHOP') label = 'At your shop';
    if (s === 'ASSIGNED' && rider && step <= cur) label = `${label} · ${rider}`;
    if (s === 'AT_SHOP' && o.weightKg != null) label = `${label} · weighed ${formatKg(Number(o.weightKg))} kg`;
    const at = s === 'BOOKED' ? o.createdAt : s === 'DELIVERED' ? o.deliveredAt : null;
    return { status: s, label, state: step < cur ? 'done' : step === cur ? 'now' : 'next', at };
  });
}

export function weighHistory(o: Pick<OrderView, 'loadCategory' | 'weightEstimateKg' | 'weightKg'>): string {
  const est = loadLabel(o);
  const kg = o.weightKg != null ? `${formatKg(Number(o.weightKg))} kg` : null;
  if (!est) return kg ? `Weighed ${kg}` : 'Not weighed yet';
  return `Booked as ${est} · ${kg ? `weighed ${kg}` : 'not weighed yet'}`;
}

// The shop's payout as the API stored it (no hardcoded percentage); null
// when an older API leaves it out.
export function payoutPhp(o: Partial<Pick<OrderView, 'shopRemittancePhp'>>): string | null {
  const v = o.shopRemittancePhp;
  return v != null && Number.isFinite(Number(v)) ? v : null;
}

export function backHref(o: Pick<OrderView, 'status'>): string {
  const b = bucketOf(o.status);
  return b === 'needs' || b === 'incoming' ? '/' : `/?tab=${b}`;
}
