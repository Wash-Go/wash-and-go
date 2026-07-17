import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthedRequest } from './current-user.decorator';

/*
 * Thin wrapper (debate C1): all resolution logic lives in AuthService (pure,
 * unit-tested). This guard only pulls headers, skips @Public routes, and
 * attaches the resolved user. Registered as APP_GUARD so every route is
 * protected unless explicitly @Public (secure-by-default, debate D3).
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<FastifyRequest & AuthedRequest>();
    const uid = await this.auth.resolveFirebaseUid({
      bearer: this.bearer(req),
      devUid: this.header(req, 'x-dev-uid'),
    });
    req.authUser = await this.auth.resolveAuthedUser(uid);
    return true;
  }

  private bearer(req: FastifyRequest): string | null {
    const authz = req.headers['authorization'];
    return typeof authz === 'string' && authz.startsWith('Bearer ')
      ? authz.slice(7)
      : null;
  }

  private header(req: FastifyRequest, name: string): string | null {
    const v = req.headers[name];
    return typeof v === 'string' && v.length > 0 ? v : null;
  }
}
