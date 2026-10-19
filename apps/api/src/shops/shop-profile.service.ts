import { ConflictException, Injectable } from '@nestjs/common';
import type { Shop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateShopProfileDto } from './dto/shop-profile.dto';
import { ShopAccessService } from './shop-access.service';
import type { ShopHoursDay } from './shop-hours';
import { type PayoutAccountView, payoutView } from './shop-payout';
import { profileFieldsData } from './shop-profile-fields';

// GET /shop/me — the caller's shop after verification. No margin fields
// (commission stays server-side); the payout number only ever masked.
export interface ShopProfileView {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  contactPhone: string | null;
  description: string | null;
  hours: ShopHoursDay[] | null;
  expressSlotsPerDay: number;
  status: string;
  verifiedAt: string | null;
  payoutAccount: PayoutAccountView | null;
  myRole: 'OWNER' | 'STAFF';
}

/*
 * Shop self-management (portal B4): profile, hours and capacity on a shop that
 * is past onboarding. DRAFT/SUBMITTED shops edit through PATCH
 * /shop/onboarding instead (its lock rules apply there). OWNER edits, STAFF
 * reads; the shop always comes from the caller's ShopMember row.
 */
@Injectable()
export class ShopProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ShopAccessService,
  ) {}

  async get(userId: string): Promise<ShopProfileView> {
    const m = await this.access.membership(userId);
    const shop = await this.prisma.shop.findUnique({ where: { id: m.shopId } });
    return shapeProfile(shop as Shop, m.role);
  }

  async update(userId: string, dto: UpdateShopProfileDto): Promise<ShopProfileView> {
    const m = await this.access.ownerMembership(userId, 'edit the shop');
    const shop = (await this.prisma.shop.findUnique({ where: { id: m.shopId } })) as Shop;
    if (shop.status === 'DRAFT' || shop.status === 'SUBMITTED') {
      throw new ConflictException(
        'This shop is still in onboarding — edit it with PATCH /shop/onboarding',
      );
    }
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: profileFieldsData(dto),
    });
    return shapeProfile(updated, m.role);
  }
}

export function shapeProfile(s: Shop, myRole: 'OWNER' | 'STAFF'): ShopProfileView {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat.toString(),
    lng: s.lng.toString(),
    contactPhone: s.contactPhone,
    description: s.description,
    // Written only through normalizeHours, so the stored JSON is the grid shape.
    hours: (s.hours as unknown as ShopHoursDay[] | null) ?? null,
    expressSlotsPerDay: s.expressSlotsPerDay,
    status: s.status,
    verifiedAt: s.verifiedAt ? s.verifiedAt.toISOString() : null,
    payoutAccount: payoutView(s),
    myRole,
  };
}
