import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Order, Prisma, User, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import type { OrdersRepository } from './orders.repository';
import type { PrismaService } from '../prisma/prisma.service';
import type { PlatformConfigService } from '../platform-config/platform-config.service';
import { ZonesService } from '../zones/zones.service';
import type { ZonesRepository } from '../zones/zones.repository';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

function makeUser(roles: UserRole[], id = 'usr'): User {
  return {
    id,
    firebaseUid: `fb-${id}`,
    phone: '+639170000000',
    displayName: 'Test',
    roles,
    createdAt: new Date(),
    disabledAt: null,
  } as User;
}

function makeShopService() {
  return {
    id: 'shopsvc1',
    shopId: 'shop1',
    serviceId: 'svc1',
    ratePhp: D('25.00'),
    turnaroundHours: 24,
    active: true,
    shop: {
      id: 'shop1',
      name: 'Tetuan',
      address: 'Tetuan',
      lat: D('6.9111'),
      lng: D('122.0794'),
      active: true,
      commissionPct: D('12.00'),
      expressSlotsPerDay: 8,
      createdAt: new Date(),
    },
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    code: 'WG-2026-000001',
    customerId: 'cust',
    serviceType: 'EXPRESS',
    status: 'BOOKED',
    pickupAddress: 'Tetuan',
    pickupLat: D('6.9111'),
    pickupLng: D('122.0794'),
    shopId: 'shop1',
    shopServiceId: 'shopsvc1',
    assignedRiderId: null,
    weightEstimateKg: D('6'),
    weightKg: null,
    washValuePhp: D('150.00'),
    deliveryFeePhp: D('65.00'),
    serviceFeePhp: D('7.00'),
    commissionPhp: D('18.00'),
    shopRemittancePhp: D('132.00'),
    customerTotalPhp: D('222.00'),
    paidCashAt: null,
    createdAt: new Date(),
    deliveredAt: null,
    ...overrides,
  } as Order;
}

function makeUserRow(id: string, roles: UserRole[] = ['CUSTOMER']) {
  return {
    id,
    firebaseUid: `fb-${id}`,
    phone: '+639170000000',
    displayName: `User ${id}`,
    roles,
    createdAt: new Date(),
    disabledAt: null,
  };
}

// Order with the relations the shaped read loads.
function makeRelOrder(overrides: Partial<Order> = {}) {
  const o = makeOrder(overrides);
  return {
    ...o,
    shop: {
      id: 'shop1',
      name: 'Tetuan Laundry Hub',
      address: 'Tetuan, Zamboanga City',
      lat: D('6.9111'),
      lng: D('122.0794'),
      active: true,
      commissionPct: D('12.00'),
      expressSlotsPerDay: 8,
      createdAt: new Date(),
    },
    customer: makeUserRow(o.customerId),
    assignedRider: o.assignedRiderId
      ? makeUserRow(o.assignedRiderId, ['RIDER'])
      : null,
  };
}

const inCoverage = { pickupLat: 6.9111, pickupLng: 122.0794 };

describe('OrdersService', () => {
  let repo: jest.Mocked<OrdersRepository>;
  let prisma: PrismaService;
  let service: OrdersService;
  // Mutable config values so a test can flip autoDispatchEnabled without re-wiring.
  let cfgValues: Record<string, unknown>;

  beforeEach(() => {
    repo = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findShopServiceWithShop: jest.fn(),
      findActiveShopServices: jest.fn(),
      countExpressUsedByShopForDay: jest.fn().mockResolvedValue(new Map()),
      isShopMember: jest.fn(),
      userHasRole: jest.fn(),
      lockShopDay: jest.fn().mockResolvedValue(undefined),
      countExpressOrdersForShopDay: jest.fn(),
      pickAutoDispatchRider: jest.fn().mockResolvedValue(null),
      mintOrderCode: jest.fn().mockResolvedValue('WG-2026-000001'),
      createOrder: jest.fn(),
      findByIdForUpdate: jest.fn(),
      updateOrder: jest.fn(),
      insertOrderEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
      insertRemittanceLine: jest.fn().mockResolvedValue({ id: 'r1' }),
      findById: jest.fn(),
      findMany: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findManyWithRelations: jest.fn(),
    } as unknown as jest.Mocked<OrdersRepository>;

    // $transaction just runs the callback with a throwaway tx client — the repo
    // is mocked, so the tx object is never actually used.
    prisma = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb({})),
    } as unknown as PrismaService;

    cfgValues = {
      serviceFeePhp: '7',
      delivery: {
        baseDeliveryPhp: 40,
        freeKm: 2,
        perKmPhp: 8,
        maxDeliveryPhp: 150,
        roadFactor: 1.3,
      },
      maxResolveKm: 20,
      expressWeightThresholdKg: 6,
      minOrderPricePhp: '0',
      platformFeePhp: '0',
      autoDispatchEnabled: 0, // OFF by default — existing tests stay BOOKED
      updatedAt: new Date(),
    };
    const config = {
      getValues: async () => cfgValues,
    } as unknown as PlatformConfigService;

    // Real ZonesService with no zones → falls back to the pilot Zamboanga ring,
    // giving true coverage behavior (central ZC in, Manila out) without mocking.
    const zones = new ZonesService({
      findActive: async () => [],
    } as unknown as ZonesRepository);

    service = new OrdersService(prisma, repo, config, zones);
  });

  describe('createExpressOrder', () => {
    const dto = {
      shopServiceId: 'shopsvc1',
      pickupAddress: 'Tetuan',
      ...inCoverage,
      loadCategory: 'M' as const, // 6kg estimate → the golden ₱197 order
    };

    it('books when in coverage and capacity remains, pricing the golden order', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(0);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );

      await service.createExpressOrder(makeUser(['CUSTOMER'], 'cust'), dto);

      const createArg = repo.createOrder.mock.calls[0][1] as {
        washValuePhp: Prisma.Decimal;
        commissionPhp: Prisma.Decimal;
        shopRemittancePhp: Prisma.Decimal;
        deliveryFeePhp: Prisma.Decimal;
        customerTotalPhp: Prisma.Decimal;
      };
      expect(createArg.washValuePhp.toFixed(2)).toBe('150.00');
      expect(createArg.commissionPhp.toFixed(2)).toBe('18.00');
      expect(createArg.shopRemittancePhp.toFixed(2)).toBe('132.00');
      // pickup == shop coords → 0 km → delivery = base ₱40; total = 150 + 40 + 7
      expect(createArg.deliveryFeePhp.toFixed(2)).toBe('40.00');
      expect(createArg.customerTotalPhp.toFixed(2)).toBe('197.00');
      // T1 ordering: lock before count.
      expect(repo.lockShopDay).toHaveBeenCalled();
      expect(repo.countExpressOrdersForShopDay).toHaveBeenCalled();
      // S1: booking event written.
      expect(repo.insertOrderEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ status: 'BOOKED', actorUserId: 'cust' }),
      );
    });

    it('rejects a pickup outside coverage before touching the DB', async () => {
      await expect(
        service.createExpressOrder(makeUser(['CUSTOMER']), {
          ...dto,
          pickupLat: 14.5995,
          pickupLng: 120.9842,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findShopServiceWithShop).not.toHaveBeenCalled();
    });

    it('rejects when the shop has no express capacity left', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(8); // == slots
      await expect(
        service.createExpressOrder(makeUser(['CUSTOMER']), dto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.createOrder).not.toHaveBeenCalled();
    });

    it('rejects an inactive service', async () => {
      const ss = makeShopService();
      ss.active = false;
      repo.findShopServiceWithShop.mockResolvedValue(ss as never);
      await expect(
        service.createExpressOrder(makeUser(['CUSTOMER']), dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an over-threshold load (Large) before any coverage/DB work', async () => {
      await expect(
        service.createExpressOrder(makeUser(['CUSTOMER']), {
          ...dto,
          loadCategory: 'L', // 9kg > 6kg express ceiling → Scheduled
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findShopServiceWithShop).not.toHaveBeenCalled();
    });

    it('auto-dispatches to a rider when the toggle is on', async () => {
      cfgValues.autoDispatchEnabled = 1;
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(0);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );
      repo.pickAutoDispatchRider.mockResolvedValue('rider7');

      const order = await service.createExpressOrder(makeUser(['CUSTOMER'], 'cust'), dto);

      expect(repo.updateOrder).toHaveBeenCalledWith(
        {},
        'o1',
        expect.objectContaining({
          status: 'ASSIGNED',
          assignedRider: { connect: { id: 'rider7' } },
        }),
      );
      expect(repo.insertOrderEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          status: 'ASSIGNED',
          meta: expect.objectContaining({ autoDispatch: true, riderId: 'rider7' }),
        }),
      );
      expect(order.status).toBe('ASSIGNED');
      expect(order.assignedRiderId).toBe('rider7');
    });

    it('stays BOOKED when the toggle is on but no rider is available', async () => {
      cfgValues.autoDispatchEnabled = 1;
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(0);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );
      repo.pickAutoDispatchRider.mockResolvedValue(null);

      const order = await service.createExpressOrder(makeUser(['CUSTOMER']), dto);
      expect(order.status).toBe('BOOKED');
      expect(repo.updateOrder).not.toHaveBeenCalled();
    });

    it('does not auto-dispatch when the toggle is off (default)', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(0);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );

      const order = await service.createExpressOrder(makeUser(['CUSTOMER']), dto);
      expect(order.status).toBe('BOOKED');
      expect(repo.pickAutoDispatchRider).not.toHaveBeenCalled();
    });

    it('is idempotent — a repeated key returns the existing order, no new booking', async () => {
      repo.findByIdempotencyKey.mockResolvedValue({ id: 'existing' } as never);
      const order = await service.createExpressOrder(
        makeUser(['CUSTOMER']),
        dto,
        'key-123',
      );
      expect(order).toEqual({ id: 'existing' });
      // short-circuited before any work
      expect(repo.findShopServiceWithShop).not.toHaveBeenCalled();
      expect(repo.createOrder).not.toHaveBeenCalled();
    });

    it('persists the idempotency key on a fresh booking', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.countExpressOrdersForShopDay.mockResolvedValue(0);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );
      await service.createExpressOrder(makeUser(['CUSTOMER']), dto, 'key-abc');
      expect(repo.createOrder.mock.calls[0][1]).toEqual(
        expect.objectContaining({ idempotencyKey: 'key-abc' }),
      );
    });
  });

  describe('createScheduledOrder', () => {
    const futureIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const schedDto = {
      shopServiceId: 'shopsvc1',
      pickupAddress: 'Tetuan',
      ...inCoverage,
      loadCategory: 'L' as const, // 9kg — allowed for Scheduled (no ceiling)
      serviceType: 'SCHEDULED' as const,
      scheduledPickupAt: futureIso,
    };

    it('books a Large scheduled order with a pickup time, skipping express capacity', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.createOrder.mockImplementation((_tx, data) =>
        Promise.resolve({ id: 'o1', ...data } as never),
      );

      await service.createScheduledOrder(makeUser(['CUSTOMER'], 'cust'), schedDto);

      const createArg = repo.createOrder.mock.calls[0][1] as {
        serviceType: string;
        scheduledPickupAt: Date;
        washValuePhp: Prisma.Decimal;
      };
      expect(createArg.serviceType).toBe('SCHEDULED');
      expect(createArg.scheduledPickupAt).toBeInstanceOf(Date);
      // 9kg × ₱25 = ₱225 — no express weight ceiling applied.
      expect(createArg.washValuePhp.toFixed(2)).toBe('225.00');
      // Express-only machinery is untouched for a scheduled order.
      expect(repo.lockShopDay).not.toHaveBeenCalled();
      expect(repo.countExpressOrdersForShopDay).not.toHaveBeenCalled();
      expect(repo.insertOrderEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ status: 'BOOKED', actorUserId: 'cust' }),
      );
    });

    it('rejects a scheduled order with no pickup time', async () => {
      await expect(
        service.createScheduledOrder(makeUser(['CUSTOMER']), {
          ...schedDto,
          scheduledPickupAt: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findShopServiceWithShop).not.toHaveBeenCalled();
    });

    it('rejects a pickup time in the past', async () => {
      await expect(
        service.createScheduledOrder(makeUser(['CUSTOMER']), {
          ...schedDto,
          scheduledPickupAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('previewOrder', () => {
    it('prices the golden order without writing anything', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      const b = await service.previewOrder({
        shopServiceId: 'shopsvc1',
        weightKg: 6,
        pickupLat: 6.9111,
        pickupLng: 122.0794,
      });
      expect(b.washValuePhp.toFixed(2)).toBe('150.00');
      // pickup == shop → 0 km → delivery ₱40; total 150 + 40 + 7
      expect(b.customerTotalPhp.toFixed(2)).toBe('197.00');
      expect(repo.createOrder).not.toHaveBeenCalled();
    });

    it('rejects an unavailable service', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(null);
      await expect(
        service.previewOrder({
          shopServiceId: 'x',
          weightKg: 6,
          pickupLat: 6.9111,
          pickupLng: 122.0794,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('quoteOrder', () => {
    function farShopService() {
      const base = makeShopService();
      return {
        ...base,
        id: 'shopsvc-far',
        shop: { ...base.shop, id: 'shop-far', lat: D('6.9600'), lng: D('122.1300') },
      };
    }

    it('resolves the nearest shop and prices with distance delivery', async () => {
      // Tetuan (shopsvc1) is at the pickup coords → 0 km → nearest.
      repo.findActiveShopServices.mockResolvedValue([
        farShopService(),
        makeShopService(),
      ] as never);
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'M',
      });
      expect(q.shopServiceId).toBe('shopsvc1');
      expect(q.shop.distanceKm).toBe(0);
      expect(q.breakdown.customerTotalPhp.toFixed(2)).toBe('197.00');
    });

    it('honors a shopServiceId override (skips resolve)', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'M',
        shopServiceId: 'shopsvc1',
      });
      expect(q.shopServiceId).toBe('shopsvc1');
      expect(repo.findActiveShopServices).not.toHaveBeenCalled();
    });

    it('rejects when no shops are available', async () => {
      repo.findActiveShopServices.mockResolvedValue([]);
      await expect(
        service.quoteOrder({ pickupLat: 6.9111, pickupLng: 122.0794, loadCategory: 'M' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an over-threshold load (Large) and points to Scheduled', async () => {
      repo.findActiveShopServices.mockResolvedValue([makeShopService()] as never);
      await expect(
        service.quoteOrder({ pickupLat: 6.9111, pickupLng: 122.0794, loadCategory: 'L' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // rejected on the load rule, before any shop resolution
      expect(repo.findActiveShopServices).not.toHaveBeenCalled();
    });

    it('prices Small at its 3kg estimate (wash ₱75)', async () => {
      repo.findActiveShopServices.mockResolvedValue([makeShopService()] as never);
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'S',
      });
      expect(q.breakdown.washValuePhp.toFixed(2)).toBe('75.00'); // 25 × 3
    });

    it('prices a Large SCHEDULED quote (no ceiling, wash ₱225)', async () => {
      repo.findActiveShopServices.mockResolvedValue([makeShopService()] as never);
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'L',
        serviceType: 'SCHEDULED',
      });
      expect(q.breakdown.washValuePhp.toFixed(2)).toBe('225.00'); // 25 × 9
    });

    it('prefers an available shop over a nearer one at its express cap', async () => {
      repo.findActiveShopServices.mockResolvedValue([
        makeShopService(), // near (0 km), cap 8
        farShopService(), // far
      ] as never);
      // near shop is full today; far shop (not in the map) has room.
      repo.countExpressUsedByShopForDay.mockResolvedValue(new Map([['shop1', 8]]));
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'M',
      });
      expect(q.shopServiceId).toBe('shopsvc-far');
    });

    it('ignores express capacity for SCHEDULED — nearest wins even if full', async () => {
      repo.findActiveShopServices.mockResolvedValue([
        makeShopService(),
        farShopService(),
      ] as never);
      repo.countExpressUsedByShopForDay.mockResolvedValue(new Map([['shop1', 8]]));
      const q = await service.quoteOrder({
        pickupLat: 6.9111,
        pickupLng: 122.0794,
        loadCategory: 'L',
        serviceType: 'SCHEDULED',
      });
      expect(q.shopServiceId).toBe('shopsvc1'); // nearest, capacity ignored
      expect(repo.countExpressUsedByShopForDay).not.toHaveBeenCalled();
    });
  });

  describe('assignRider', () => {
    it('rejects assigning a non-rider', async () => {
      repo.userHasRole.mockResolvedValue(false);
      await expect(
        service.assignRider(makeUser(['ADMIN']), 'o1', { riderId: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assigns and transitions BOOKED → ASSIGNED', async () => {
      repo.userHasRole.mockResolvedValue(true);
      repo.findByIdForUpdate.mockResolvedValue(makeOrder({ status: 'BOOKED' }));
      repo.updateOrder.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
      const out = await service.assignRider(makeUser(['ADMIN']), 'o1', {
        riderId: 'rider1',
      });
      expect(out.status).toBe('ASSIGNED');
      expect(repo.insertOrderEvent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ status: 'ASSIGNED' }),
      );
    });

    it('404s a missing order', async () => {
      repo.userHasRole.mockResolvedValue(true);
      repo.findByIdForUpdate.mockResolvedValue(null);
      await expect(
        service.assignRider(makeUser(['ADMIN']), 'nope', { riderId: 'r' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('weigh', () => {
    it('recomputes the breakdown from the actual weight', async () => {
      repo.findByIdForUpdate.mockResolvedValue(makeOrder({ status: 'AT_SHOP' }));
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.updateOrder.mockImplementation((_tx, _id, data) =>
        Promise.resolve(data as never),
      );

      await service.weigh(makeUser(['ADMIN']), 'o1', { weightKg: 6.4 });

      const upd = repo.updateOrder.mock.calls[0][2] as {
        weightKg: Prisma.Decimal;
        washValuePhp: Prisma.Decimal;
        commissionPhp: Prisma.Decimal;
      };
      expect(upd.washValuePhp.toFixed(2)).toBe('160.00'); // 6.4 × 25
      expect(upd.commissionPhp.toFixed(2)).toBe('19.20'); // 12%
    });

    it('forbids a shop member who is not on the order shop', async () => {
      repo.findByIdForUpdate.mockResolvedValue(makeOrder({ status: 'AT_SHOP' }));
      repo.isShopMember.mockResolvedValue(false);
      await expect(
        service.weigh(makeUser(['SHOP_STAFF']), 'o1', { weightKg: 6 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects weighing before the order is at the shop', async () => {
      repo.findByIdForUpdate.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
      await expect(
        service.weigh(makeUser(['ADMIN']), 'o1', { weightKg: 6 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('transition', () => {
    it('rejects an illegal transition with 409', async () => {
      repo.findByIdForUpdate.mockResolvedValue(makeOrder({ status: 'BOOKED' }));
      await expect(
        service.transition(makeUser(['ADMIN']), 'o1', { status: 'DELIVERED' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('forbids a role that cannot drive the edge', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ status: 'AT_SHOP' }),
      );
      // RIDER cannot drive AT_SHOP → PROCESSING
      await expect(
        service.transition(makeUser(['RIDER'], 'r1'), 'o1', {
          status: 'PROCESSING',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids a rider transitioning an order not assigned to them', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ status: 'ASSIGNED', assignedRiderId: 'other' }),
      );
      await expect(
        service.transition(makeUser(['RIDER'], 'r1'), 'o1', {
          status: 'PICKED_UP',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('writes a remittance line in the same tx on DELIVERED (S2)', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ status: 'OUT_FOR_RETURN', assignedRiderId: 'r1' }),
      );
      repo.updateOrder.mockResolvedValue(makeOrder({ status: 'DELIVERED' }));

      await service.transition(makeUser(['RIDER'], 'r1'), 'o1', {
        status: 'DELIVERED',
      });

      expect(repo.insertRemittanceLine).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          orderId: 'o1',
          shopId: 'shop1',
        }),
      );
      const line = repo.insertRemittanceLine.mock.calls[0][1] as {
        payoutPhp: Prisma.Decimal;
      };
      expect(line.payoutPhp.toFixed(2)).toBe('132.00'); // == shopRemittancePhp
    });

    it('does not write remittance on a non-DELIVERED transition', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ status: 'ASSIGNED', assignedRiderId: 'r1' }),
      );
      repo.updateOrder.mockResolvedValue(makeOrder({ status: 'PICKED_UP' }));
      await service.transition(makeUser(['RIDER'], 'r1'), 'o1', {
        status: 'PICKED_UP',
      });
      expect(repo.insertRemittanceLine).not.toHaveBeenCalled();
    });
  });

  describe('getOrder ownership + shaped read', () => {
    it('lets the owning customer view', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ customerId: 'cust' }) as never,
      );
      await expect(
        service.getOrder(makeUser(['CUSTOMER'], 'cust'), 'o1'),
      ).resolves.toBeDefined();
    });

    it('forbids a stranger customer', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ customerId: 'someoneelse' }) as never,
      );
      await expect(
        service.getOrder(makeUser(['CUSTOMER'], 'cust'), 'o1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an admin view anything', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ customerId: 'x' }) as never,
      );
      await expect(
        service.getOrder(makeUser(['ADMIN']), 'o1'),
      ).resolves.toBeDefined();
    });

    it('surfaces shop drop-off + customer contact to the assigned rider', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ status: 'ASSIGNED', assignedRiderId: 'r1' }) as never,
      );
      const d = await service.getOrder(makeUser(['RIDER'], 'r1'), 'o1');
      expect(d.shop?.address).toContain('Zamboanga');
      expect(d.customer.phone).toBeTruthy();
    });
  });

  describe('availableActions', () => {
    it('offers the assigned rider their next step (ASSIGNED → PICKED_UP)', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ status: 'ASSIGNED', assignedRiderId: 'r1' }) as never,
      );
      const d = await service.getOrder(makeUser(['RIDER'], 'r1'), 'o1');
      expect(d.availableActions).toEqual(['PICKED_UP']);
    });

    it('offers the assigned rider Delivered from OUT_FOR_RETURN', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ status: 'OUT_FOR_RETURN', assignedRiderId: 'r1' }) as never,
      );
      const d = await service.getOrder(makeUser(['RIDER'], 'r1'), 'o1');
      expect(d.availableActions).toEqual(['DELIVERED']);
    });

    it('offers the assigned rider nothing while the shop holds the order', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ status: 'AT_SHOP', assignedRiderId: 'r1' }) as never,
      );
      const d = await service.getOrder(makeUser(['RIDER'], 'r1'), 'o1');
      expect(d.availableActions).toEqual([]);
    });

    it('offers admin assign + cancel on a BOOKED order', async () => {
      repo.findByIdWithRelations.mockResolvedValue(
        makeRelOrder({ status: 'BOOKED' }) as never,
      );
      const d = await service.getOrder(makeUser(['ADMIN']), 'o1');
      expect([...d.availableActions].sort()).toEqual(['ASSIGNED', 'CANCELLED']);
    });
  });

  // ── payCash (B4: previously untested cash-money endpoint) ────────────────
  describe('payCash', () => {
    it('is idempotent — already paid returns the order without a second write', async () => {
      const paid = makeOrder({
        status: 'DELIVERED',
        assignedRiderId: 'rider1',
        paidCashAt: new Date('2026-07-20T00:00:00Z'),
      });
      repo.findByIdForUpdate.mockResolvedValue(paid as never);

      const out = await service.payCash(makeUser(['RIDER'], 'rider1'), 'o1');

      expect(out).toBe(paid);
      expect(repo.updateOrder).not.toHaveBeenCalled();
      expect(repo.insertOrderEvent).not.toHaveBeenCalled();
    });

    it('forbids a rider who is not the assigned rider', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ assignedRiderId: 'someone-else' }) as never,
      );
      await expect(
        service.payCash(makeUser(['RIDER'], 'rider1'), 'o1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('records payment for the assigned rider', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ assignedRiderId: 'rider1', status: 'DELIVERED' }) as never,
      );
      repo.updateOrder.mockResolvedValue(makeOrder() as never);

      await service.payCash(makeUser(['RIDER'], 'rider1'), 'o1');

      expect(repo.updateOrder).toHaveBeenCalledWith(
        expect.anything(),
        'o1',
        expect.objectContaining({ paidCashAt: expect.any(Date) }),
      );
    });

    it('lets an admin record payment on any order', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ assignedRiderId: 'rider1' }) as never,
      );
      repo.updateOrder.mockResolvedValue(makeOrder() as never);
      await expect(
        service.payCash(makeUser(['ADMIN'], 'admin1'), 'o1'),
      ).resolves.toBeDefined();
    });

    it('404s a missing order', async () => {
      repo.findByIdForUpdate.mockResolvedValue(null as never);
      await expect(
        service.payCash(makeUser(['ADMIN']), 'nope'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── listOrders role scoping (B5: cross-tenant data-leak surface) ──────────
  describe('listOrders scoping', () => {
    async function whereFor(user: User): Promise<Prisma.OrderWhereInput> {
      repo.findManyWithRelations.mockResolvedValue([] as never);
      await service.listOrders(user);
      return (repo.findManyWithRelations.mock.calls[0][0] ?? {}) as Prisma.OrderWhereInput;
    }

    it('scopes a CUSTOMER to their own orders', async () => {
      const w = await whereFor(makeUser(['CUSTOMER'], 'cust1'));
      expect(w.OR).toEqual([{ customerId: 'cust1' }]);
    });

    it('scopes a RIDER to their assigned orders', async () => {
      const w = await whereFor(makeUser(['RIDER'], 'rider1'));
      expect(w.OR).toEqual([{ assignedRiderId: 'rider1' }]);
    });

    it('scopes a shop member to their shop', async () => {
      const w = await whereFor(makeUser(['SHOP_OWNER'], 'owner1'));
      expect(w.OR).toEqual([
        { shop: { members: { some: { userId: 'owner1' } } } },
      ]);
    });

    it('shows an ADMIN everything (no scope filter)', async () => {
      const w = await whereFor(makeUser(['ADMIN'], 'admin1'));
      expect(w.OR).toBeUndefined();
    });

    it('shows a user with no order-bearing role nothing (sentinel)', async () => {
      const w = await whereFor(makeUser([], 'ghost'));
      expect(w.OR).toEqual([{ id: '__none__' }]);
    });
  });

  // ── previously-untested gate branches (B7) ───────────────────────────────
  describe('gate branches', () => {
    it('assignRider rejects assigning from a non-BOOKED state', async () => {
      repo.userHasRole.mockResolvedValue(true as never);
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({ status: 'ASSIGNED' }) as never,
      );
      await expect(
        service.assignRider(makeUser(['ADMIN']), 'o1', { riderId: 'rider1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('transition to DELIVERED with a null shopId conflicts (no remittance target)', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({
          status: 'OUT_FOR_RETURN',
          shopId: null,
          assignedRiderId: 'rider1',
        }) as never,
      );
      repo.updateOrder.mockResolvedValue(makeOrder() as never);
      await expect(
        service.transition(makeUser(['RIDER'], 'rider1'), 'o1', {
          status: 'DELIVERED',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.insertRemittanceLine).not.toHaveBeenCalled();
    });

    it('previewOrder rejects an inactive shop', async () => {
      const ss = makeShopService();
      ss.shop.active = false;
      repo.findShopServiceWithShop.mockResolvedValue(ss as never);
      await expect(
        service.previewOrder({ shopServiceId: 'shopsvc1', weightKg: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('quoteOrder rejects an inactive override service', async () => {
      const ss = makeShopService();
      ss.active = false;
      repo.findShopServiceWithShop.mockResolvedValue(ss as never);
      await expect(
        service.quoteOrder({
          pickupLat: 6.9111,
          pickupLng: 122.0794,
          loadCategory: 'M',
          shopServiceId: 'shopsvc1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('quoteOrder rejects when the nearest shop is beyond maxResolveKm', async () => {
      const far = makeShopService();
      // Manila → far shop coords (~Cebu, hundreds of km) > 20km radius.
      far.shop.lat = D('10.3157');
      far.shop.lng = D('123.8854');
      repo.findActiveShopServices.mockResolvedValue([far] as never);
      await expect(
        service.quoteOrder({ pickupLat: 6.9111, pickupLng: 122.0794, loadCategory: 'M' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── weigh null-pickup guard (B3) ─────────────────────────────────────────
  describe('weigh null-pickup', () => {
    it('charges base delivery (km=0) instead of computing distance to (0,0)', async () => {
      repo.findByIdForUpdate.mockResolvedValue(
        makeOrder({
          status: 'AT_SHOP',
          pickupLat: null,
          pickupLng: null,
        }) as never,
      );
      repo.isShopMember.mockResolvedValue(true as never);
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      repo.updateOrder.mockResolvedValue(makeOrder() as never);

      await service.weigh(makeUser(['SHOP_OWNER'], 'owner1'), 'o1', { weightKg: 5 });

      const arg = repo.updateOrder.mock.calls[0][2] as { deliveryFeePhp: Prisma.Decimal };
      // base ₱40, not the ₱150 cap a mid-Atlantic (0,0) distance would produce.
      expect(arg.deliveryFeePhp.toFixed(2)).toBe('40.00');
    });
  });

  // ── assertCanView shop-member branch (B7) ────────────────────────────────
  describe('getOrder shop-member visibility', () => {
    it('lets a shop member view their shop’s order', async () => {
      repo.findByIdWithRelations.mockResolvedValue(makeRelOrder() as never);
      repo.isShopMember.mockResolvedValue(true as never);
      await expect(
        service.getOrder(makeUser(['SHOP_OWNER'], 'owner1'), 'o1'),
      ).resolves.toBeDefined();
    });

    it('forbids a shop user who is not a member of the order’s shop', async () => {
      repo.findByIdWithRelations.mockResolvedValue(makeRelOrder() as never);
      repo.isShopMember.mockResolvedValue(false as never);
      await expect(
        service.getOrder(makeUser(['SHOP_STAFF'], 'stranger'), 'o1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
