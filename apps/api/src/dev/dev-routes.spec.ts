import 'reflect-metadata';
import { CanActivate, ExecutionContext, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { devModules } from './dev-routes';
import { DevUsersModule } from './dev-users.module';
import { DevUsersService } from './dev-users.service';

/*
 * POST/DELETE /dev/users exist ONLY with AUTH_DEV_BYPASS=1 in a dev/test
 * NODE_ENV (the same A1 rule as the bypass itself). Otherwise the module is
 * not imported and the routes 404. Production with the bypass on refuses to
 * boot at all.
 */
describe('devModules(env) — which dev-only modules AppModule imports', () => {
  it.each([
    ['bypass off, development', { AUTH_DEV_BYPASS: '0', NODE_ENV: 'development' }],
    ['bypass unset, development', { NODE_ENV: 'development' }],
    ['bypass off, production', { AUTH_DEV_BYPASS: '0', NODE_ENV: 'production' }],
    ['bypass off, test', { AUTH_DEV_BYPASS: '0', NODE_ENV: 'test' }],
  ])('%s → none', (_l, env) => {
    expect(devModules(env)).toEqual([]);
  });

  it.each([
    ['development', { AUTH_DEV_BYPASS: '1', NODE_ENV: 'development' }],
    ['test', { AUTH_DEV_BYPASS: '1', NODE_ENV: 'test' }],
  ])('bypass on, %s → DevUsersModule', (_l, env) => {
    expect(devModules(env)).toEqual([DevUsersModule]);
  });

  it.each([
    ['production', 'production'],
    ['staging', 'staging'],
    ['unset', undefined],
  ])('bypass on, NODE_ENV %s → refuses (throws)', (_l, nodeEnv) => {
    expect(() => devModules({ AUTH_DEV_BYPASS: '1', NODE_ENV: nodeEnv })).toThrow(
      /AUTH_DEV_BYPASS is only allowed/,
    );
  });
});

describe('/dev/users over HTTP', () => {
  // Stands in for the global FirebaseAuthGuard: a request with no x-dev-uid
  // is refused, so the routes are never anonymous.
  class FakeAuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string> }>();
      return Boolean(req.headers['x-dev-uid']);
    }
  }
  const service = { upsert: jest.fn(), remove: jest.fn() };

  async function appFor(env: Record<string, string | undefined>) {
    @Module({ imports: [...devModules(env)] })
    class Root {}
    const mod = await Test.createTestingModule({
      imports: [Root],
      providers: [{ provide: APP_GUARD, useClass: FakeAuthGuard }],
    })
      .overrideProvider(DevUsersService)
      .useValue(service)
      .compile();
    const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app;
  }
  const H = { 'x-dev-uid': 'dev-admin' };

  beforeEach(() => {
    service.upsert.mockReset().mockResolvedValue({ id: 'u1' });
    service.remove.mockReset().mockResolvedValue(undefined);
  });

  it('bypass off → both routes 404 (module not loaded)', async () => {
    const app = await appFor({ AUTH_DEV_BYPASS: '0', NODE_ENV: 'development' });
    const post = await app.inject({
      method: 'POST',
      url: '/dev/users',
      headers: H,
      payload: { uid: 'e2e-1' },
    });
    const del = await app.inject({ method: 'DELETE', url: '/dev/users/e2e-1', headers: H });
    expect([post.statusCode, del.statusCode]).toEqual([404, 404]);
    await app.close();
  });

  it('dev → POST upserts (201) and DELETE returns 204', async () => {
    const app = await appFor({ AUTH_DEV_BYPASS: '1', NODE_ENV: 'development' });
    const post = await app.inject({
      method: 'POST',
      url: '/dev/users',
      headers: H,
      payload: {
        uid: 'e2e-1',
        displayName: 'Ana',
        email: 'Ana@Example.com',
        roles: ['SHOP_OWNER'],
      },
    });
    expect(post.statusCode).toBe(201);
    expect(service.upsert).toHaveBeenCalledWith({
      uid: 'e2e-1',
      displayName: 'Ana',
      email: 'Ana@Example.com',
      roles: ['SHOP_OWNER'],
    });
    const del = await app.inject({ method: 'DELETE', url: '/dev/users/e2e-1', headers: H });
    expect(del.statusCode).toBe(204);
    expect(service.remove).toHaveBeenCalledWith('e2e-1');
    await app.close();
  });

  it('dev → unauthenticated calls are refused (never anonymous)', async () => {
    const app = await appFor({ AUTH_DEV_BYPASS: '1', NODE_ENV: 'development' });
    const post = await app.inject({ method: 'POST', url: '/dev/users', payload: { uid: 'e2e-1' } });
    const del = await app.inject({ method: 'DELETE', url: '/dev/users/e2e-1' });
    expect([post.statusCode, del.statusCode]).toEqual([403, 403]);
    expect(service.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([
    [{ uid: '' }],
    [{ uid: 'has space' }],
    [{ uid: 'x'.repeat(129) }],
    [{ uid: 'ok', email: 'not-an-email' }],
    [{ uid: 'ok', roles: ['GOD'] }],
    [{ uid: 'ok', phone: '+639171234567' }],
  ])('dev → 400 for %p', async (payload) => {
    const app = await appFor({ AUTH_DEV_BYPASS: '1', NODE_ENV: 'development' });
    const res = await app.inject({ method: 'POST', url: '/dev/users', headers: H, payload });
    expect(res.statusCode).toBe(400);
    expect(service.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it('dev → DELETE rejects a malformed uid (400)', async () => {
    const app = await appFor({ AUTH_DEV_BYPASS: '1', NODE_ENV: 'development' });
    const res = await app.inject({ method: 'DELETE', url: '/dev/users/bad%20uid', headers: H });
    expect(res.statusCode).toBe(400);
    expect(service.remove).not.toHaveBeenCalled();
    await app.close();
  });
});
