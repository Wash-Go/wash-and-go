import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Shop, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOwnedKey } from '../uploads/object-key';
import type { UpdateOnboardingDto } from './dto/shop-onboarding.dto';

// Owner-facing view — NO margin fields (commission/slots stay server-side).
export interface OwnerShopView {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  status: string;
  rejectionReason: string | null;
  permitKey: string | null;
  photoKeys: string[];
  submittedAt: string | null;
  verifiedAt: string | null;
}

/*
 * Self-serve shop onboarding (checkpoint B2). A signed-in user starts a DRAFT
 * shop (and is granted SHOP_OWNER), fills the wizard, then submits for admin
 * review. Editing is locked once SUBMITTED/VERIFIED; a REJECTED shop can be
 * edited + resubmitted.
 */
@Injectable()
export class ShopOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  // The caller's owned shop, or null (portal decides: show wizard vs "start").
  async mine(user: User): Promise<OwnerShopView | null> {
    const shop = await this.ownedShop(user.id);
    return shop ? this.shape(shop) : null;
  }

  // Idempotent: returns the existing owned shop, or creates a DRAFT one and
  // grants SHOP_OWNER in a single transaction.
  async start(user: User): Promise<OwnerShopView> {
    const existing = await this.ownedShop(user.id);
    if (existing) return this.shape(existing);

    const shop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        // Owner-set placeholders; the wizard fills real name/address/coords.
        data: { name: 'My laundry', address: '', lat: new Prisma.Decimal(0), lng: new Prisma.Decimal(0) },
      });
      await tx.shopMember.create({
        data: { shopId: created.id, userId: user.id, role: 'OWNER' },
      });
      const roles = [...new Set([...user.roles, 'SHOP_OWNER' as const])];
      await tx.user.update({ where: { id: user.id }, data: { roles } });
      return created;
    });
    return this.shape(shop);
  }

  async update(user: User, dto: UpdateOnboardingDto): Promise<OwnerShopView> {
    const shop = await this.mustOwn(user.id);
    if (shop.status === 'SUBMITTED' || shop.status === 'VERIFIED') {
      throw new ConflictException(
        shop.status === 'SUBMITTED'
          ? 'Your application is under review and can’t be edited'
          : 'A verified shop is edited from the admin console',
      );
    }
    // Proof keys must live under the caller's own upload prefix — otherwise a
    // crafted key would make the reviewing admin (who can presign-GET any key)
    // fetch someone else's private object.
    if (dto.permitKey != null) assertOwnedKey(user.id, dto.permitKey);
    (dto.photoKeys ?? []).forEach((k) => assertOwnedKey(user.id, k));

    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.address != null ? { address: dto.address } : {}),
        ...(dto.lat != null ? { lat: new Prisma.Decimal(dto.lat) } : {}),
        ...(dto.lng != null ? { lng: new Prisma.Decimal(dto.lng) } : {}),
        ...(dto.permitKey != null ? { permitKey: dto.permitKey } : {}),
        ...(dto.photoKeys != null ? { photoKeys: dto.photoKeys } : {}),
      },
    });
    return this.shape(updated);
  }

  async submit(user: User): Promise<OwnerShopView> {
    const shop = await this.mustOwn(user.id);
    if (shop.status === 'SUBMITTED') throw new ConflictException('Already submitted');
    if (shop.status === 'VERIFIED') throw new ConflictException('Already verified');
    // Required set before review.
    const missing: string[] = [];
    if (!shop.name || shop.name === 'My laundry') missing.push('shop name');
    if (!shop.address) missing.push('address');
    if (Number(shop.lat) === 0 && Number(shop.lng) === 0) missing.push('map location');
    if (!shop.permitKey) missing.push('business permit');
    if (missing.length) {
      throw new BadRequestException(`Please add: ${missing.join(', ')}`);
    }
    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null },
    });
    return this.shape(updated);
  }

  private ownedShop(userId: string): Promise<Shop | null> {
    return this.prisma.shopMember
      .findFirst({ where: { userId, role: 'OWNER' }, include: { shop: true } })
      .then((m) => m?.shop ?? null);
  }

  private async mustOwn(userId: string): Promise<Shop> {
    const shop = await this.ownedShop(userId);
    if (!shop) throw new NotFoundException('You don’t have a shop yet — start onboarding first');
    return shop;
  }

  private shape(s: Shop): OwnerShopView {
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat.toString(),
      lng: s.lng.toString(),
      status: s.status,
      rejectionReason: s.rejectionReason,
      permitKey: s.permitKey,
      photoKeys: s.photoKeys,
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      verifiedAt: s.verifiedAt ? s.verifiedAt.toISOString() : null,
    };
  }
}
