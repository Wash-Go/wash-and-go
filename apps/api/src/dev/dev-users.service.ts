import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { type MeResponse, toMe } from '../auth/auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { placeholderPhone } from '../users/phone';

/*
 * E2E fixture users (dev/test only — see dev-routes.ts). Lets Playwright specs
 * create the x-dev-uid user they act as and clean it up afterwards without
 * reaching into Postgres themselves.
 */
@Injectable()
export class DevUsersService {
  private readonly logger = new Logger('DevUsers');

  constructor(private readonly prisma: PrismaService) {}

  // Upsert by uid (firebaseUid). Create: placeholder phone, displayName '' and
  // roles ['CUSTOMER'] unless given. Update: only the fields sent.
  async upsert(input: {
    uid: string;
    displayName?: string;
    email?: string;
    roles?: UserRole[];
  }): Promise<MeResponse> {
    const email = input.email?.trim().toLowerCase();
    const roles = input.roles ? [...new Set(input.roles)] : undefined;
    const user = await this.prisma.user.upsert({
      where: { firebaseUid: input.uid },
      create: {
        firebaseUid: input.uid,
        phone: placeholderPhone(input.uid),
        displayName: input.displayName ?? '',
        roles: roles ?? ['CUSTOMER'],
        ...(email ? { email } : {}),
      },
      update: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(email ? { email } : {}),
        ...(roles ? { roles } : {}),
      },
    });
    this.logger.log({ event: 'dev.user.upserted', userId: user.id, roles: user.roles });
    return toMe(user, false);
  }

  /*
   * Remove the user and everything that would block or orphan it, in one
   * transaction. Cascade (children before parents):
   *   shops it SOLELY owns (no other OWNER) → their orders (+ OrderEvent,
   *     Rating, RemittanceLine), their RemittanceBatch rows, ShopService,
   *     ShopInvite, ShopMember, the Shop;
   *   orders where it is the customer (any shop) → same per-order children;
   *   orders it rides → assignedRiderId set null; events it acted on → actor
   *     null;
   *   invites it SENT (any shop) deleted; invites it accepted → FK SET NULL;
   *   its ShopMember rows, Notification, Address, RiderCashDeposit,
   *     RiderProfile; then the User.
   * Unknown uid → no-op (cleanup is idempotent).
   */
  async remove(uid: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { firebaseUid: uid } });
      if (!user) return;

      const owned = await tx.shopMember.findMany({ where: { userId: user.id, role: 'OWNER' } });
      const soleShopIds: string[] = [];
      for (const m of owned) {
        const owners = await tx.shopMember.count({ where: { shopId: m.shopId, role: 'OWNER' } });
        if (owners === 1) soleShopIds.push(m.shopId);
      }

      const orders = await tx.order.findMany({
        where: { OR: [{ shopId: { in: soleShopIds } }, { customerId: user.id }] },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      await deleteOrders(tx, orderIds);

      await tx.order.updateMany({
        where: { assignedRiderId: user.id },
        data: { assignedRiderId: null },
      });
      await tx.orderEvent.updateMany({
        where: { actorUserId: user.id },
        data: { actorUserId: null },
      });

      if (soleShopIds.length) {
        // Lines of these shops' batches that belong to orders NOT deleted
        // above can't exist (lines carry the order's shop), so the batches
        // are now empty.
        await tx.remittanceLine.deleteMany({ where: { shopId: { in: soleShopIds } } });
        await tx.remittanceBatch.deleteMany({ where: { shopId: { in: soleShopIds } } });
        await tx.shopService.deleteMany({ where: { shopId: { in: soleShopIds } } });
        await tx.shopInvite.deleteMany({ where: { shopId: { in: soleShopIds } } });
        await tx.shopMember.deleteMany({ where: { shopId: { in: soleShopIds } } });
        await tx.shop.deleteMany({ where: { id: { in: soleShopIds } } });
      }

      await tx.shopInvite.deleteMany({ where: { invitedByUserId: user.id } });
      await tx.shopMember.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.address.deleteMany({ where: { userId: user.id } });
      await tx.riderCashDeposit.deleteMany({ where: { riderId: user.id } });
      await tx.riderProfile.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });

      this.logger.log({
        event: 'dev.user.removed',
        userId: user.id,
        shops: soleShopIds.length,
        orders: orderIds.length,
      });
    });
  }
}

async function deleteOrders(tx: Prisma.TransactionClient, orderIds: string[]): Promise<void> {
  if (!orderIds.length) return;
  await tx.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
  await tx.rating.deleteMany({ where: { orderId: { in: orderIds } } });
  await tx.remittanceLine.deleteMany({ where: { orderId: { in: orderIds } } });
  await tx.order.deleteMany({ where: { id: { in: orderIds } } });
}
