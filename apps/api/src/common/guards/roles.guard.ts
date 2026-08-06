import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../auth/roles.decorator';
import type { AuthedRequest } from '../../auth/current-user.decorator';

/*
 * Coarse role gate (plan D2). Runs after the global FirebaseAuthGuard has
 * attached req.authUser, so it only compares the DB-sourced roles against the
 * route's @Roles metadata. Applied per-controller via @UseGuards(RolesGuard);
 * routes with no @Roles pass any authenticated user through. Per-order
 * ownership is enforced downstream in OrdersService (needs the loaded row).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = req.authUser;
    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }
    if (!user.roles.some((r) => required.includes(r))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
