import { Order, Prisma } from '@prisma/client';

/*
 * Cash-on-delivery rule for the DELIVERED transition (U0 T2). COD is the only
 * payment method at launch: the Order model has no payment-method column
 * (`paidCashAt` is the only payment field; PayMongo lands Phase 2), so "this
 * order is paid in cash at the door" is modelled as: it has a positive customer
 * total. Delivering such an order IS collecting its cash, so the transition
 * records it in the same write, which also puts it in the rider's outstanding
 * COD (collected = their orders with paidCashAt) and so under the debt cap.
 *
 * Returns the amount to record, or null when delivery must record nothing:
 *  - already paid: an earlier pay-cash stays as it was (never re-stamped, never
 *    counted twice);
 *  - total ≤ 0: nothing to collect, so no cash is invented;
 *  - no assigned rider: nobody would owe the cash (rider balances are keyed by
 *    assignedRiderId), so marking it paid would make it vanish from
 *    reconciliation. It stays unpaid and visible; ops records it explicitly.
 *
 * The rider app mirrors the "positive total" test to choose its slide label
 * (apps/rider-mobile/src/lib/triage.ts `collectsCash`).
 */
export function cashToRecordOnDelivery(
  order: Pick<Order, 'customerTotalPhp' | 'paidCashAt' | 'assignedRiderId'>,
): Prisma.Decimal | null {
  if (order.paidCashAt) return null;
  if (!order.assignedRiderId) return null;
  if (!order.customerTotalPhp.gt(0)) return null;
  return order.customerTotalPhp;
}
