import { OrderStatus, UserRole } from '@prisma/client';

/*
 * Hand-rolled status machine (plan §5; xstate deferred). The express-lite happy
 * path is a straight line BOOKED → ASSIGNED → PICKED_UP → AT_SHOP → PROCESSING
 * → READY_FOR_RETURN → OUT_FOR_RETURN → DELIVERED, with CANCELLED reachable
 * from any non-terminal state by an admin. Each edge also names the roles
 * allowed to drive it (plan D2 role matrix). ADMIN can drive every edge.
 *
 * The service enforces the transition inside a tx with SELECT ... FOR UPDATE on
 * the order row and writes the OrderEvent in the SAME tx (S1).
 */

type EdgeRoles = Partial<Record<OrderStatus, UserRole[]>>;

const TRANSITIONS: Record<OrderStatus, EdgeRoles> = {
  BOOKED: { ASSIGNED: ['ADMIN'], CANCELLED: ['ADMIN'] },
  ASSIGNED: { PICKED_UP: ['RIDER', 'ADMIN'], CANCELLED: ['ADMIN'] },
  PICKED_UP: { AT_SHOP: ['RIDER', 'ADMIN'], CANCELLED: ['ADMIN'] },
  AT_SHOP: {
    PROCESSING: ['SHOP_OWNER', 'SHOP_STAFF', 'ADMIN'],
    CANCELLED: ['ADMIN'],
  },
  PROCESSING: {
    READY_FOR_RETURN: ['SHOP_OWNER', 'SHOP_STAFF', 'ADMIN'],
    CANCELLED: ['ADMIN'],
  },
  READY_FOR_RETURN: {
    OUT_FOR_RETURN: ['RIDER', 'ADMIN'],
    CANCELLED: ['ADMIN'],
  },
  OUT_FOR_RETURN: { DELIVERED: ['RIDER', 'ADMIN'] },
  DELIVERED: {},
  CANCELLED: {},
};

export function isLegalTransition(from: OrderStatus, to: OrderStatus): boolean {
  return Boolean(TRANSITIONS[from]?.[to]);
}

// Roles permitted to drive a given (legal) transition. Empty array if illegal.
export function rolesForTransition(
  from: OrderStatus,
  to: OrderStatus,
): UserRole[] {
  return TRANSITIONS[from]?.[to] ?? [];
}

export function canRoleDrive(
  from: OrderStatus,
  to: OrderStatus,
  roles: UserRole[],
): boolean {
  const allowed = rolesForTransition(from, to);
  return allowed.length > 0 && roles.some((r) => allowed.includes(r));
}

// Terminal states have no outgoing edges.
export function isTerminal(status: OrderStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}
