import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Coarse role gate (plan D2). The route requires the caller to hold at least one
// of these roles; per-order ownership (customer sees only own orders, shop only
// its assigned-shop orders) is a finer check enforced in OrdersService, since it
// needs the loaded row. Pairs with @UseGuards(RolesGuard).
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
