import { OrderStatus } from '@prisma/client';

// Auto-dispatch (P4a). A rider is "busy" while they hold an order anywhere
// between assignment and delivery. BOOKED has no rider; DELIVERED/CANCELLED are
// terminal — neither counts as active load.
export const ACTIVE_RIDER_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.AT_SHOP,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_RETURN,
  OrderStatus.OUT_FOR_RETURN,
];

// Pick the least-loaded rider (fewest active jobs); ties break by id for
// determinism. No rider location/online data exists yet, so selection is purely
// workload-based — proximity joins this once rider location tracking lands.
// Returns null when there are no candidates.
export function selectLeastLoadedRider(
  riderIds: string[],
  activeLoad: Map<string, number>,
): string | null {
  if (riderIds.length === 0) return null;
  return [...riderIds].sort(
    (a, b) =>
      (activeLoad.get(a) ?? 0) - (activeLoad.get(b) ?? 0) || a.localeCompare(b),
  )[0];
}
