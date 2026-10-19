import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

// Populated by FirebaseAuthGuard after verifying identity + resolving the
// Postgres user. Roles + state come from the DB, not the token (debate D11).
// `authEmailVerified`: the bearer's email is verified by a trusted provider
// (false for the x-dev-uid stub).
export type AuthedRequest = { authUser: User; authEmailVerified?: boolean };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.authUser;
  },
);

export const EmailVerified = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean =>
    ctx.switchToHttp().getRequest<AuthedRequest>().authEmailVerified === true,
);
