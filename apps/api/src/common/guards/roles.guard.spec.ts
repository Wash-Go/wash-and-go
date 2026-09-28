import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { User, UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../auth/roles.decorator';

function makeUser(roles: UserRole[]): User {
  return {
    id: 'u1',
    firebaseUid: 'fb-1',
    phone: '+639170000000',
    displayName: 'Test',
    roles,
    createdAt: new Date(),
    disabledAt: null,
  } as User;
}

function ctxWith(user: User | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ authUser: user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardFor(required: UserRole[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows any authenticated user when the route declares no roles', () => {
    const guard = guardFor(undefined);
    expect(guard.canActivate(ctxWith(makeUser(['CUSTOMER'])))).toBe(true);
  });

  it('allows when the user holds one of the required roles', () => {
    const guard = guardFor(['ADMIN', 'RIDER']);
    expect(guard.canActivate(ctxWith(makeUser(['RIDER'])))).toBe(true);
  });

  it('rejects when the user holds none of the required roles', () => {
    const guard = guardFor(['ADMIN']);
    expect(() => guard.canActivate(ctxWith(makeUser(['CUSTOMER'])))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when no user is attached (guard misordering / unauthenticated)', () => {
    const guard = guardFor(['CUSTOMER']);
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('reads roles metadata from both handler and class', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const handler = () => undefined;
    const klass = class {};
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ authUser: makeUser(['ADMIN']) }) }),
      getHandler: () => handler,
      getClass: () => klass,
    } as unknown as ExecutionContext;
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      klass,
    ]);
  });
});
