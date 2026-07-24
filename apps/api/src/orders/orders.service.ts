import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Order,
  OrderStatus,
  Prisma,
  ServiceType,
  Shop,
  ShopService,
  User,
} from '@prisma/client';
import { isExpressEligible, loadCategory, LoadCategoryKey } from './load';
import { PrismaService } from '../prisma/prisma.service';
import { pricePreview, PricingBreakdown, PricingError } from '../pricing/pricing';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { computeDeliveryFee, haversineKm } from '../pricing/distance';
import { OrdersRepository, OrderWithRelations } from './orders.repository';
import { ZonesService } from '../zones/zones.service';
import { manilaDayWindow } from './manila-time';
import {
  canRoleDrive,
  isLegalTransition,
  nextStatuses,
  rolesForTransition,
} from './order-status';

// Shaped order read (rider/customer apps): scalar order fields + minimal shop /
// customer / rider relations + the actions THIS actor may drive next.
export type OrderDetail = Order & {
  shop: { id: string; name: string; address: string } | null;
  customer: { id: string; displayName: string; phone: string };
  rider: { id: string; displayName: string } | null;
  availableActions: OrderStatus[];
};
import {
  AssignRiderDto,
  CreateOrderDto,
  PreviewOrderDto,
  QuoteOrderDto,
  TransitionDto,
  WeighDto,
} from './dto/orders.dto';

// Checkout quote result — resolved (closest/chosen) shop + full breakdown.
export type OrderQuoteResult = {
  shopServiceId: string;
  shop: { id: string; name: string; address: string; distanceKm: number };
  breakdown: PricingBreakdown;
};

/*
 * Orchestrator for the express-lite money path (ADR-003 acceptance slice). This
 * service — never a controller or the repo — opens every transaction and threads
 * the tx client into OrdersRepository. Money-path findings folded in:
 *  T1 capacity: advisory lock → count → insert, all one tx
 *  S1 audit:    OrderEvent written in the same tx as the status change
 *  S2 payout:   RemittanceLine written in the same tx as the DELIVERED transition
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: OrdersRepository,
    private readonly config: PlatformConfigService,
    private readonly zones: ZonesService,
  ) {}

  private async price(
    ratePhp: Prisma.Decimal,
    weightKg: number | string | Prisma.Decimal,
    commissionPct: Prisma.Decimal,
    oneWayKm: number,
  ): Promise<PricingBreakdown> {
    try {
      const cfg = await this.config.getValues();
      const deliveryFeePhp = computeDeliveryFee(oneWayKm, cfg.delivery);
      return pricePreview({
        ratePhp,
        weightKg,
        commissionPct,
        deliveryFeePhp,
        serviceFeePhp: cfg.serviceFeePhp,
      });
    } catch (e) {
      if (e instanceof PricingError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  // One-way haversine km between a customer pickup and a shop (both Decimals on
  // the shop side). Interim distance for the delivery fee (routing API later).
  private kmToShop(
    pickup: { lat: number; lng: number },
    shop: { lat: Prisma.Decimal; lng: Prisma.Decimal },
  ): number {
    return haversineKm(pickup, { lat: Number(shop.lat), lng: Number(shop.lng) });
  }

  // Map a load category → its estimate kg AND enforce the Express weight ceiling
  // (Logistics v1.1). Over-threshold categories belong to Scheduled (Tier 1),
  // which isn't live yet, so we reject with a clear pointer. The config threshold
  // is authoritative (admin-editable); the shared domain rule keeps client + server
  // in agreement. Applied at both quote and create (create is the backstop).
  private async resolveExpressLoadKg(key: LoadCategoryKey): Promise<number> {
    const cat = loadCategory(key);
    if (!cat) throw new BadRequestException('Unknown load category');
    const { expressWeightThresholdKg } = await this.config.getValues();
    if (!isExpressEligible(cat, expressWeightThresholdKg)) {
      throw new BadRequestException(
        `${cat.label} loads exceed the ${expressWeightThresholdKg}kg Express limit — use our Scheduled service (coming soon).`,
      );
    }
    return cat.estimateKg;
  }

  // POST /orders/preview — read-only price estimate before booking (eng review
  // D3). Reuses the same engine as create, so the preview total always matches
  // what the order will be priced at for identical inputs. No write, no coverage
  // check (no location yet at preview time).
  async previewOrder(dto: PreviewOrderDto): Promise<PricingBreakdown> {
    const shopService = await this.repo.findShopServiceWithShop(
      dto.shopServiceId,
    );
    if (!shopService || !shopService.active || !shopService.shop.active) {
      throw new BadRequestException('Service unavailable');
    }
    const km =
      dto.pickupLat != null && dto.pickupLng != null
        ? this.kmToShop(
            { lat: dto.pickupLat, lng: dto.pickupLng },
            shopService.shop,
          )
        : 0;
    return this.price(
      shopService.ratePhp,
      dto.weightKg,
      shopService.shop.commissionPct,
      km,
    );
  }

  // Resolve the nearest active shop-service to a pickup point (haversine). MVP:
  // nearest within a max radius; express capacity is enforced at create.
  // Fallback ranking + live-GPS + dynamic-config radius land with the maps slice.
  private async resolveNearest(pickup: { lat: number; lng: number }): Promise<{
    ss: ShopService & { shop: Shop };
    km: number;
  }> {
    const ranked = (await this.repo.findActiveShopServices())
      .map((ss) => ({ ss, km: this.kmToShop(pickup, ss.shop) }))
      .sort((a, b) => a.km - b.km);
    const nearest = ranked[0];
    if (!nearest) throw new BadRequestException('No laundry shops available');
    const { maxResolveKm } = await this.config.getValues();
    if (nearest.km > maxResolveKm) {
      throw new BadRequestException('Pickup location is outside coverage');
    }
    return nearest;
  }

  // POST /orders/quote — resolve the shop (nearest, or the override) + full
  // price breakdown (distance delivery fee). Powers the checkout screen.
  async quoteOrder(dto: QuoteOrderDto): Promise<OrderQuoteResult> {
    const estimateKg = await this.resolveExpressLoadKg(dto.loadCategory);
    const pickup = { lat: dto.pickupLat, lng: dto.pickupLng };
    let ss: ShopService & { shop: Shop };
    let km: number;
    if (dto.shopServiceId) {
      const chosen = await this.repo.findShopServiceWithShop(dto.shopServiceId);
      if (!chosen || !chosen.active || !chosen.shop.active) {
        throw new BadRequestException('Service unavailable');
      }
      ss = chosen;
      km = this.kmToShop(pickup, chosen.shop);
    } else {
      const n = await this.resolveNearest(pickup);
      ss = n.ss;
      km = n.km;
    }
    const breakdown = await this.price(
      ss.ratePhp,
      estimateKg,
      ss.shop.commissionPct,
      km,
    );
    return {
      shopServiceId: ss.id,
      shop: {
        id: ss.shop.id,
        name: ss.shop.name,
        address: ss.shop.address,
        distanceKm: Math.round(km * 10) / 10,
      },
      breakdown,
    };
  }

  // POST /orders — customer books an express order.
  async createExpressOrder(actor: User, dto: CreateOrderDto): Promise<Order> {
    // Backstop the Express weight ceiling before any work (the client gates it too).
    const estimateKg = await this.resolveExpressLoadKg(dto.loadCategory);

    if (!(await this.zones.isCovered({ lat: dto.pickupLat, lng: dto.pickupLng }))) {
      throw new BadRequestException('Pickup location is outside coverage');
    }

    const shopService = await this.repo.findShopServiceWithShop(
      dto.shopServiceId,
    );
    if (!shopService || !shopService.active || !shopService.shop.active) {
      throw new BadRequestException('Service unavailable');
    }
    const shop = shopService.shop;

    const km = this.kmToShop({ lat: dto.pickupLat, lng: dto.pickupLng }, shop);
    const breakdown = await this.price(
      shopService.ratePhp,
      estimateKg,
      shop.commissionPct,
      km,
    );

    const window = manilaDayWindow(new Date());

    return this.prisma.$transaction(async (tx) => {
      // T1: lock the shop-day BEFORE counting, so concurrent bookings serialize.
      await this.repo.lockShopDay(tx, shop.id, window.dateStr);
      const used = await this.repo.countExpressOrdersForShopDay(
        tx,
        shop.id,
        window.dayStartUtc,
        window.dayEndUtc,
      );
      if (used >= shop.expressSlotsPerDay) {
        throw new ConflictException('No express capacity for this shop today');
      }

      const code = await this.repo.mintOrderCode(tx);
      const order = await this.repo.createOrder(tx, {
        code,
        serviceType: ServiceType.EXPRESS,
        status: OrderStatus.BOOKED,
        pickupAddress: dto.pickupAddress,
        pickupLat: new Prisma.Decimal(dto.pickupLat),
        pickupLng: new Prisma.Decimal(dto.pickupLng),
        weightEstimateKg: new Prisma.Decimal(estimateKg),
        washValuePhp: breakdown.washValuePhp,
        deliveryFeePhp: breakdown.deliveryFeePhp,
        serviceFeePhp: breakdown.serviceFeePhp,
        commissionPhp: breakdown.commissionPhp,
        shopRemittancePhp: breakdown.shopRemittancePhp,
        customerTotalPhp: breakdown.customerTotalPhp,
        customer: { connect: { id: actor.id } },
        shop: { connect: { id: shop.id } },
        shopService: { connect: { id: shopService.id } },
      });

      // S1: booking event in the same tx.
      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: OrderStatus.BOOKED,
        actorUserId: actor.id,
      });

      return order;
    });
  }

  private validateScheduledTime(iso?: string): Date {
    if (!iso) {
      throw new BadRequestException(
        'scheduledPickupAt is required for a Scheduled order',
      );
    }
    const when = new Date(iso);
    if (Number.isNaN(when.getTime())) {
      throw new BadRequestException('scheduledPickupAt is not a valid date');
    }
    if (when.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledPickupAt must be in the future');
    }
    return when;
  }

  // POST /orders (serviceType=SCHEDULED) — a Tier 1 Scheduled booking. Unlike
  // Express: no weight ceiling (any load category), no express slot/advisory
  // lock (batch capacity + route consolidation land in P2), and it carries a
  // requested pickup time. Same coverage check + pricing engine.
  async createScheduledOrder(actor: User, dto: CreateOrderDto): Promise<Order> {
    const when = this.validateScheduledTime(dto.scheduledPickupAt);
    const cat = loadCategory(dto.loadCategory);
    if (!cat) throw new BadRequestException('Unknown load category');
    const estimateKg = cat.estimateKg; // Scheduled accepts any size

    if (!(await this.zones.isCovered({ lat: dto.pickupLat, lng: dto.pickupLng }))) {
      throw new BadRequestException('Pickup location is outside coverage');
    }

    const shopService = await this.repo.findShopServiceWithShop(
      dto.shopServiceId,
    );
    if (!shopService || !shopService.active || !shopService.shop.active) {
      throw new BadRequestException('Service unavailable');
    }
    const shop = shopService.shop;

    const km = this.kmToShop({ lat: dto.pickupLat, lng: dto.pickupLng }, shop);
    const breakdown = await this.price(
      shopService.ratePhp,
      estimateKg,
      shop.commissionPct,
      km,
    );

    return this.prisma.$transaction(async (tx) => {
      const code = await this.repo.mintOrderCode(tx);
      const order = await this.repo.createOrder(tx, {
        code,
        serviceType: ServiceType.SCHEDULED,
        status: OrderStatus.BOOKED,
        pickupAddress: dto.pickupAddress,
        pickupLat: new Prisma.Decimal(dto.pickupLat),
        pickupLng: new Prisma.Decimal(dto.pickupLng),
        weightEstimateKg: new Prisma.Decimal(estimateKg),
        scheduledPickupAt: when,
        washValuePhp: breakdown.washValuePhp,
        deliveryFeePhp: breakdown.deliveryFeePhp,
        serviceFeePhp: breakdown.serviceFeePhp,
        commissionPhp: breakdown.commissionPhp,
        shopRemittancePhp: breakdown.shopRemittancePhp,
        customerTotalPhp: breakdown.customerTotalPhp,
        customer: { connect: { id: actor.id } },
        shop: { connect: { id: shop.id } },
        shopService: { connect: { id: shopService.id } },
      });

      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: OrderStatus.BOOKED,
        actorUserId: actor.id,
        meta: { scheduledPickupAt: when.toISOString() },
      });

      return order;
    });
  }

  // POST /orders/:id/assign-rider — admin manual dispatch (BOOKED → ASSIGNED).
  async assignRider(
    actor: User,
    orderId: string,
    dto: AssignRiderDto,
  ): Promise<Order> {
    const riderOk = await this.repo.userHasRole(dto.riderId, 'RIDER');
    if (!riderOk) throw new BadRequestException('Assignee is not a rider');

    return this.prisma.$transaction(async (tx) => {
      const order = await this.repo.findByIdForUpdate(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (!isLegalTransition(order.status, OrderStatus.ASSIGNED)) {
        throw new ConflictException(
          `Cannot assign a rider from ${order.status}`,
        );
      }

      const updated = await this.repo.updateOrder(tx, order.id, {
        status: OrderStatus.ASSIGNED,
        assignedRider: { connect: { id: dto.riderId } },
      });
      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: OrderStatus.ASSIGNED,
        actorUserId: actor.id,
        meta: { riderId: dto.riderId },
      });
      return updated;
    });
  }

  // POST /orders/:id/weigh — shop sets actual weight; price recomputes.
  async weigh(actor: User, orderId: string, dto: WeighDto): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.repo.findByIdForUpdate(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');

      await this.assertShopActor(actor, order.shopId);

      if (
        order.status !== OrderStatus.AT_SHOP &&
        order.status !== OrderStatus.PROCESSING
      ) {
        throw new ConflictException('Order is not at the shop for weighing');
      }
      if (!order.shopServiceId) {
        throw new ConflictException('Order has no service to price');
      }

      const shopService = await this.repo.findShopServiceWithShop(
        order.shopServiceId,
      );
      if (!shopService) throw new ConflictException('Service no longer exists');

      // If pickup coords are absent, charge base delivery (km=0) rather than
      // computing distance to (0,0) — mid-Atlantic — which would cap the fee at
      // max and inflate the customer total. Express always has coords; this
      // guards a future no-coords (e.g. scheduled) order.
      const km =
        order.pickupLat != null && order.pickupLng != null
          ? this.kmToShop(
              { lat: Number(order.pickupLat), lng: Number(order.pickupLng) },
              shopService.shop,
            )
          : 0;
      const breakdown = await this.price(
        shopService.ratePhp,
        dto.weightKg,
        shopService.shop.commissionPct,
        km,
      );

      const updated = await this.repo.updateOrder(tx, order.id, {
        weightKg: new Prisma.Decimal(dto.weightKg),
        washValuePhp: breakdown.washValuePhp,
        deliveryFeePhp: breakdown.deliveryFeePhp,
        serviceFeePhp: breakdown.serviceFeePhp,
        commissionPhp: breakdown.commissionPhp,
        shopRemittancePhp: breakdown.shopRemittancePhp,
        customerTotalPhp: breakdown.customerTotalPhp,
      });
      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: order.status,
        actorUserId: actor.id,
        meta: { weighedKg: dto.weightKg },
      });
      return updated;
    });
  }

  // POST /orders/:id/status — a legal transition, role- and ownership-gated.
  async transition(
    actor: User,
    orderId: string,
    dto: TransitionDto,
  ): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.repo.findByIdForUpdate(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');

      const from = order.status;
      const to = dto.status;
      if (!isLegalTransition(from, to)) {
        throw new ConflictException(`Illegal transition ${from} → ${to}`);
      }
      if (!canRoleDrive(from, to, actor.roles)) {
        throw new ForbiddenException(
          `Your role cannot drive ${from} → ${to}`,
        );
      }
      await this.assertTransitionOwnership(actor, order, from, to);

      const data: Prisma.OrderUpdateInput = { status: to };
      if (to === OrderStatus.DELIVERED) {
        data.deliveredAt = new Date();
      }
      const updated = await this.repo.updateOrder(tx, order.id, data);

      // S1: audit in the same tx.
      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: to,
        actorUserId: actor.id,
      });

      // S2: remittance in the same tx as the DELIVERED transition. unique(orderId)
      // is the idempotency backstop; the status machine makes DELIVERED reachable
      // once (it is terminal).
      if (to === OrderStatus.DELIVERED) {
        if (!order.shopId) throw new ConflictException('Order has no shop');
        await this.repo.insertRemittanceLine(tx, {
          orderId: order.id,
          shopId: order.shopId,
          washValuePhp: order.washValuePhp,
          commissionPhp: order.commissionPhp,
          payoutPhp: order.shopRemittancePhp,
        });
      }

      return updated;
    });
  }

  // POST /orders/:id/pay-cash — record a manual cash payment (idempotent).
  async payCash(actor: User, orderId: string): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.repo.findByIdForUpdate(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (
        !actor.roles.includes('ADMIN') &&
        order.assignedRiderId !== actor.id
      ) {
        throw new ForbiddenException('Not your assigned order');
      }
      if (order.paidCashAt) return order; // idempotent

      const updated = await this.repo.updateOrder(tx, order.id, {
        paidCashAt: new Date(),
      });
      await this.repo.insertOrderEvent(tx, {
        orderId: order.id,
        status: order.status,
        actorUserId: actor.id,
        meta: { paidCash: true },
      });
      return updated;
    });
  }

  async getOrder(actor: User, orderId: string): Promise<OrderDetail> {
    const order = await this.repo.findByIdWithRelations(orderId);
    if (!order) throw new NotFoundException('Order not found');
    await this.assertCanView(actor, order);
    return this.toDetail(actor, order);
  }

  async listOrders(actor: User, status?: OrderStatus): Promise<OrderDetail[]> {
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;

    if (!actor.roles.includes('ADMIN')) {
      const scopes: Prisma.OrderWhereInput[] = [];
      if (actor.roles.includes('CUSTOMER')) {
        scopes.push({ customerId: actor.id });
      }
      if (actor.roles.includes('RIDER')) {
        scopes.push({ assignedRiderId: actor.id });
      }
      if (
        actor.roles.includes('SHOP_OWNER') ||
        actor.roles.includes('SHOP_STAFF')
      ) {
        scopes.push({ shop: { members: { some: { userId: actor.id } } } });
      }
      // A user with no order-bearing role sees nothing.
      where.OR = scopes.length > 0 ? scopes : [{ id: '__none__' }];
    }

    const orders = await this.repo.findManyWithRelations(where);
    return Promise.all(orders.map((o) => this.toDetail(actor, o)));
  }

  // ── ownership helpers ───────────────────────────────────────────────────

  private async assertShopActor(
    actor: User,
    shopId: string | null,
  ): Promise<void> {
    if (actor.roles.includes('ADMIN')) return;
    if (!shopId || !(await this.repo.isShopMember(actor.id, shopId))) {
      throw new ForbiddenException('Not a member of this shop');
    }
  }

  // Does this actor own the resource for a given (legal) transition? Shared by
  // transition() (enforce) and availableActionsFor() (filter) — one truth.
  private async ownsTransition(
    actor: User,
    order: Order,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<boolean> {
    if (actor.roles.includes('ADMIN')) return true;
    const allowed = rolesForTransition(from, to);
    const asRider = actor.roles.includes('RIDER') && allowed.includes('RIDER');
    const asShop =
      (actor.roles.includes('SHOP_OWNER') && allowed.includes('SHOP_OWNER')) ||
      (actor.roles.includes('SHOP_STAFF') && allowed.includes('SHOP_STAFF'));

    if (asRider && order.assignedRiderId !== actor.id) return false;
    if (asShop && !(order.shopId && (await this.repo.isShopMember(actor.id, order.shopId)))) {
      return false;
    }
    return true;
  }

  private async assertTransitionOwnership(
    actor: User,
    order: Order,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<void> {
    if (!(await this.ownsTransition(actor, order, from, to))) {
      throw new ForbiddenException('Not your order to move');
    }
  }

  // The next statuses THIS actor can legally drive on THIS order (role + owner).
  private async availableActionsFor(
    actor: User,
    order: Order,
  ): Promise<OrderStatus[]> {
    const from = order.status;
    const out: OrderStatus[] = [];
    for (const to of nextStatuses(from)) {
      if (!canRoleDrive(from, to, actor.roles)) continue;
      if (!(await this.ownsTransition(actor, order, from, to))) continue;
      out.push(to);
    }
    return out;
  }

  private async toDetail(
    actor: User,
    o: OrderWithRelations,
  ): Promise<OrderDetail> {
    const { shop, customer, assignedRider, ...scalars } = o;
    return {
      ...scalars,
      shop: shop ? { id: shop.id, name: shop.name, address: shop.address } : null,
      customer: {
        id: customer.id,
        displayName: customer.displayName,
        phone: customer.phone,
      },
      rider: assignedRider
        ? { id: assignedRider.id, displayName: assignedRider.displayName }
        : null,
      availableActions: await this.availableActionsFor(actor, o),
    };
  }

  private async assertCanView(actor: User, order: Order): Promise<void> {
    if (actor.roles.includes('ADMIN')) return;
    if (order.customerId === actor.id) return;
    if (order.assignedRiderId === actor.id) return;
    if (
      order.shopId &&
      (actor.roles.includes('SHOP_OWNER') ||
        actor.roles.includes('SHOP_STAFF')) &&
      (await this.repo.isShopMember(actor.id, order.shopId))
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed to view this order');
  }
}
