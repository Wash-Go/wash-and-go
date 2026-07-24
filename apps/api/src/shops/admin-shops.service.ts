import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddShopMemberDto,
  AddShopServiceDto,
  CreateShopDto,
  UpdateShopDto,
  UpdateShopServiceDto,
} from './dto/admin-shops.dto';

// Admin shop administration (checkpoint C). Full CRUD over shops, their priced
// services, and their staff — the code side of shop onboarding. All views are
// SHAPED to strings (Decimals/dates) so the wire format is stable.

export interface AdminShopView {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  active: boolean;
  commissionPct: string;
  expressSlotsPerDay: number;
  serviceCount: number;
  memberCount: number;
  createdAt: string;
}

export interface AdminShopServiceView {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  ratePhp: string;
  turnaroundHours: number;
  active: boolean;
}

export interface AdminShopMemberView {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  role: string;
}

export interface AdminShopDetail extends AdminShopView {
  services: AdminShopServiceView[];
  members: AdminShopMemberView[];
}

export interface ServiceCatalogView {
  id: string;
  code: string;
  name: string;
  billingUnit: string;
}

@Injectable()
export class AdminShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminShopView[]> {
    const shops = await this.prisma.shop.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { services: true, members: true } } },
    });
    return shops.map((s) => this.shape(s, s._count.services, s._count.members));
  }

  async get(id: string): Promise<AdminShopDetail> {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        services: { include: { service: true }, orderBy: { service: { code: 'asc' } } },
        members: { include: { user: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return {
      ...this.shape(shop, shop.services.length, shop.members.length),
      services: shop.services.map((ss) => ({
        id: ss.id,
        serviceId: ss.serviceId,
        code: ss.service.code,
        name: ss.service.name,
        ratePhp: ss.ratePhp.toFixed(2),
        turnaroundHours: ss.turnaroundHours,
        active: ss.active,
      })),
      members: shop.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.user.displayName,
        phone: m.user.phone,
        role: m.role,
      })),
    };
  }

  async create(dto: CreateShopDto): Promise<AdminShopView> {
    const shop = await this.prisma.shop.create({
      data: {
        name: dto.name,
        address: dto.address,
        lat: new Prisma.Decimal(dto.lat),
        lng: new Prisma.Decimal(dto.lng),
        ...(dto.commissionPct != null
          ? { commissionPct: new Prisma.Decimal(dto.commissionPct) }
          : {}),
        ...(dto.expressSlotsPerDay != null
          ? { expressSlotsPerDay: dto.expressSlotsPerDay }
          : {}),
      },
    });
    return this.shape(shop, 0, 0);
  }

  async update(id: string, dto: UpdateShopDto): Promise<AdminShopView> {
    await this.mustExist(id);
    const shop = await this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.address != null ? { address: dto.address } : {}),
        ...(dto.lat != null ? { lat: new Prisma.Decimal(dto.lat) } : {}),
        ...(dto.lng != null ? { lng: new Prisma.Decimal(dto.lng) } : {}),
        ...(dto.commissionPct != null
          ? { commissionPct: new Prisma.Decimal(dto.commissionPct) }
          : {}),
        ...(dto.expressSlotsPerDay != null
          ? { expressSlotsPerDay: dto.expressSlotsPerDay }
          : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
      include: { _count: { select: { services: true, members: true } } },
    });
    return this.shape(shop, shop._count.services, shop._count.members);
  }

  listCatalog(): Promise<ServiceCatalogView[]> {
    return this.prisma.serviceCatalogItem
      .findMany({ orderBy: { code: 'asc' } })
      .then((items) =>
        items.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          billingUnit: i.billingUnit,
        })),
      );
  }

  async addService(shopId: string, dto: AddShopServiceDto): Promise<AdminShopServiceView> {
    await this.mustExist(shopId);
    const service = await this.prisma.serviceCatalogItem.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) throw new BadRequestException('Unknown catalog service');
    const existing = await this.prisma.shopService.findUnique({
      where: { shopId_serviceId: { shopId, serviceId: dto.serviceId } },
    });
    if (existing) {
      throw new ConflictException('This shop already offers that service');
    }
    const ss = await this.prisma.shopService.create({
      data: {
        shopId,
        serviceId: dto.serviceId,
        ratePhp: new Prisma.Decimal(dto.ratePhp),
        turnaroundHours: dto.turnaroundHours,
      },
    });
    return {
      id: ss.id,
      serviceId: service.id,
      code: service.code,
      name: service.name,
      ratePhp: ss.ratePhp.toFixed(2),
      turnaroundHours: ss.turnaroundHours,
      active: ss.active,
    };
  }

  async updateService(
    shopId: string,
    shopServiceId: string,
    dto: UpdateShopServiceDto,
  ): Promise<AdminShopServiceView> {
    const ss = await this.prisma.shopService.findUnique({
      where: { id: shopServiceId },
      include: { service: true },
    });
    if (!ss || ss.shopId !== shopId) {
      throw new NotFoundException('Service not found on this shop');
    }
    const updated = await this.prisma.shopService.update({
      where: { id: shopServiceId },
      data: {
        ...(dto.ratePhp != null ? { ratePhp: new Prisma.Decimal(dto.ratePhp) } : {}),
        ...(dto.turnaroundHours != null ? { turnaroundHours: dto.turnaroundHours } : {}),
        ...(dto.active != null ? { active: dto.active } : {}),
      },
    });
    return {
      id: updated.id,
      serviceId: ss.serviceId,
      code: ss.service.code,
      name: ss.service.name,
      ratePhp: updated.ratePhp.toFixed(2),
      turnaroundHours: updated.turnaroundHours,
      active: updated.active,
    };
  }

  async addMember(shopId: string, dto: AddShopMemberDto): Promise<AdminShopMemberView> {
    await this.mustExist(shopId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('Unknown user');
    const existing = await this.prisma.shopMember.findUnique({
      where: { shopId_userId: { shopId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('This user is already a member of this shop');
    }
    const member = await this.prisma.shopMember.create({
      data: { shopId, userId: dto.userId, role: dto.role },
    });
    return {
      id: member.id,
      userId: user.id,
      displayName: user.displayName,
      phone: user.phone,
      role: member.role,
    };
  }

  async removeMember(shopId: string, memberId: string): Promise<void> {
    const member = await this.prisma.shopMember.findUnique({ where: { id: memberId } });
    if (!member || member.shopId !== shopId) {
      throw new NotFoundException('Member not found on this shop');
    }
    await this.prisma.shopMember.delete({ where: { id: memberId } });
  }

  private async mustExist(id: string): Promise<void> {
    const shop = await this.prisma.shop.findUnique({ where: { id }, select: { id: true } });
    if (!shop) throw new NotFoundException('Shop not found');
  }

  private shape(
    s: {
      id: string;
      name: string;
      address: string;
      lat: Prisma.Decimal;
      lng: Prisma.Decimal;
      active: boolean;
      commissionPct: Prisma.Decimal;
      expressSlotsPerDay: number;
      createdAt: Date;
    },
    serviceCount: number,
    memberCount: number,
  ): AdminShopView {
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat.toString(),
      lng: s.lng.toString(),
      active: s.active,
      commissionPct: s.commissionPct.toFixed(2),
      expressSlotsPerDay: s.expressSlotsPerDay,
      serviceCount,
      memberCount,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
