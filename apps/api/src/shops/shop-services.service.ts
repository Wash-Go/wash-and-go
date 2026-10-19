import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingUnit, Prisma, ServiceCatalogItem, ShopService } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PutShopServiceDto } from './dto/shop-services.dto';

export interface ShopCatalogItemView {
  id: string;
  code: string;
  name: string;
  billingUnit: BillingUnit;
}

// One priced service on the caller's shop. `serviceId` is the catalog id (the
// PUT path key); `id` is the ShopService row id.
export interface OwnerShopServiceView {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  billingUnit: BillingUnit;
  ratePhp: string;
  turnaroundHours: number;
  active: boolean;
}

interface Membership {
  shopId: string;
  role: string;
}

/*
 * Owner self-service pricing (portal B3 wizard step 3, reused by B4). Every
 * call resolves the shop from the CALLER's ShopMember row — a client never
 * names a shopId. Reads are OWNER or STAFF; rate changes are OWNER-only.
 * Works in any shop status (the wizard prices services on a DRAFT shop).
 * Rates go live immediately — whether they need admin approval first is a
 * pending founder decision.
 */
@Injectable()
export class ShopServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(userId: string): Promise<ShopCatalogItemView[]> {
    await this.membership(userId);
    const items = await this.prisma.serviceCatalogItem.findMany({ orderBy: { code: 'asc' } });
    return items.map((i) => ({ id: i.id, code: i.code, name: i.name, billingUnit: i.billingUnit }));
  }

  async list(userId: string): Promise<OwnerShopServiceView[]> {
    const { shopId } = await this.membership(userId);
    const rows = await this.prisma.shopService.findMany({
      where: { shopId },
      include: { service: true },
      orderBy: { service: { code: 'asc' } },
    });
    return rows.map((r) => this.shape(r));
  }

  async upsert(
    userId: string,
    serviceId: string,
    dto: PutShopServiceDto,
  ): Promise<OwnerShopServiceView> {
    const { shopId, role } = await this.membership(userId);
    if (role !== 'OWNER') throw new ForbiddenException('Only the shop owner can change rates');
    const service = await this.prisma.serviceCatalogItem.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Unknown catalog service');
    const fields = {
      ratePhp: new Prisma.Decimal(dto.ratePhp),
      turnaroundHours: dto.turnaroundHours,
      active: dto.active ?? true,
    };
    // Keyed on the (shopId, serviceId) unique, so a concurrent PUT can't
    // create a duplicate row.
    const row = await this.prisma.shopService.upsert({
      where: { shopId_serviceId: { shopId, serviceId } },
      create: { shopId, serviceId, ...fields },
      update: fields,
      include: { service: true },
    });
    return this.shape(row);
  }

  // The caller's membership; OWNER wins if they somehow hold both.
  private async membership(userId: string): Promise<Membership> {
    const m = await this.prisma.shopMember.findFirst({
      where: { userId },
      orderBy: { role: 'asc' }, // 'OWNER' < 'STAFF'
    });
    if (!m) throw new NotFoundException('You don’t have a shop yet — start onboarding first');
    return { shopId: m.shopId, role: m.role };
  }

  private shape(r: ShopService & { service: ServiceCatalogItem }): OwnerShopServiceView {
    return {
      id: r.id,
      serviceId: r.serviceId,
      code: r.service.code,
      name: r.service.name,
      billingUnit: r.service.billingUnit,
      ratePhp: r.ratePhp.toFixed(2),
      turnaroundHours: r.turnaroundHours,
      active: r.active,
    };
  }
}
