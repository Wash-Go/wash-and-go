import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

// Populated by FirebaseAuthGuard after verifying identity + resolving the
// Postgres user. Roles + state come from the DB, not the token (debate D11).
export type AuthedRequest = { authUser: User };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.authUser;
  },
);
