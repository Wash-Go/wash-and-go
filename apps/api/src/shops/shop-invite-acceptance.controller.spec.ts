import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ShopInvitesController } from './shop-invite-acceptance.controller';
import { ShopInviteAcceptanceService } from './shop-invite-acceptance.service';

/*
 * The real HTTP status of POST /shop/invites/:id/accept (Fastify, as in
 * main.ts). Swagger says 200; without @HttpCode(200) Nest answers a POST with
 * 201, so this pins the wire behaviour, not just the decorator metadata.
 */
describe('POST /shop/invites/:id/accept (HTTP)', () => {
  let app: NestFastifyApplication;
  const member = {
    id: 'm1',
    userId: 'u1',
    role: 'STAFF',
    name: 'Ana',
    email: 'ana@example.com',
    joinedAt: '2026-10-20T00:00:00.000Z',
    shopId: 's1',
    shopName: 'Suds',
  };
  const accept = jest.fn();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ShopInvitesController],
      providers: [
        { provide: ShopInviteAcceptanceService, useValue: { accept, pending: jest.fn() } },
      ],
    }).compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => accept.mockReset());

  it('first accept → 200 with the member view', async () => {
    accept.mockResolvedValue(member);
    const res = await app.inject({ method: 'POST', url: '/shop/invites/i1/accept' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(member);
  });

  it('repeat accept by the same member → 200 with the same view', async () => {
    accept.mockResolvedValue(member);
    await app.inject({ method: 'POST', url: '/shop/invites/i1/accept' });
    const res = await app.inject({ method: 'POST', url: '/shop/invites/i1/accept' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(member);
  });

  it('not yours / not open → 404', async () => {
    accept.mockRejectedValue(new NotFoundException('Invite not found'));
    const res = await app.inject({ method: 'POST', url: '/shop/invites/i1/accept' });
    expect(res.statusCode).toBe(404);
  });
});
