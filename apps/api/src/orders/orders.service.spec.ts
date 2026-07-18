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
import type { PricingConfig } from '../pricing/pricing.config';

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

  beforeEach(() => {
    repo = {
      findShopServiceWithShop: jest.fn(),
      isShopMember: jest.fn(),
      userHasRole: jest.fn(),
      lockShopDay: jest.fn().mockResolvedValue(undefined),
      countExpressOrdersForShopDay: jest.fn(),
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

    const pricingConfig = {
      expressDeliveryFeePhp: '65',
      serviceFeePhp: '7',
    } as PricingConfig;

    service = new OrdersService(prisma, repo, pricingConfig);
  });

  describe('createExpressOrder', () => {
    const dto = {
      shopServiceId: 'shopsvc1',
      pickupAddress: 'Tetuan',
      ...inCoverage,
      weightEstimateKg: 6,
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
        customerTotalPhp: Prisma.Decimal;
      };
      expect(createArg.washValuePhp.toFixed(2)).toBe('150.00');
      expect(createArg.commissionPhp.toFixed(2)).toBe('18.00');
      expect(createArg.shopRemittancePhp.toFixed(2)).toBe('132.00');
      expect(createArg.customerTotalPhp.toFixed(2)).toBe('222.00');
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
  });

  describe('previewOrder', () => {
    it('prices the golden order without writing anything', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(makeShopService() as never);
      const b = await service.previewOrder({
        shopServiceId: 'shopsvc1',
        weightKg: 6,
      });
      expect(b.washValuePhp.toFixed(2)).toBe('150.00');
      expect(b.customerTotalPhp.toFixed(2)).toBe('222.00');
      expect(repo.createOrder).not.toHaveBeenCalled();
    });

    it('rejects an unavailable service', async () => {
      repo.findShopServiceWithShop.mockResolvedValue(null);
      await expect(
        service.previewOrder({ shopServiceId: 'x', weightKg: 6 }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
});
