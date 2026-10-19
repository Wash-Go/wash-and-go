import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Shop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const NO_SHOP_MESSAGE = 'You don’t have a shop yet — start onboarding first';

export interface ShopMembership {
  memberId: string;
  shopId: string;
  role: 'OWNER' | 'STAFF';
}

// OWNER beats STAFF ('OWNER' < 'STAFF'); two memberships of the same role
// resolve to the lowest member id, so a caller always lands on the same shop.
const MEMBER_ORDER = [{ role: 'asc' as const }, { id: 'asc' as const }];

/*
 * The one place a `/shop/*` request turns "the caller" into "their shop".
 * Every shop-facing service resolves through here from the authenticated
 * user id — a client never names a shopId.
 */
@Injectable()
export class ShopAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Any membership (OWNER or STAFF); 404 when the caller has no shop.
  async membership(userId: string): Promise<ShopMembership> {
    const m = await this.prisma.shopMember.findFirst({ where: { userId }, orderBy: MEMBER_ORDER });
    if (!m) throw new NotFoundException(NO_SHOP_MESSAGE);
    return { memberId: m.id, shopId: m.shopId, role: m.role as ShopMembership['role'] };
  }

  // Money/settings routes: 404 with no shop, 403 for STAFF.
  async ownerMembership(userId: string, action = 'do this'): Promise<ShopMembership> {
    const m = await this.membership(userId);
    if (m.role !== 'OWNER') throw new ForbiddenException(`Only the shop owner can ${action}`);
    return m;
  }

  // The shop the caller OWNS (onboarding), or null.
  ownedShop(userId: string): Promise<Shop | null> {
    return this.prisma.shopMember
      .findFirst({
        where: { userId, role: 'OWNER' },
        orderBy: MEMBER_ORDER,
        include: { shop: true },
      })
      .then((m) => m?.shop ?? null);
  }
}
