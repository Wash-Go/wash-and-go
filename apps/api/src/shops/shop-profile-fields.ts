import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePhMobile } from '../users/phone';
import type { ShopProfileFieldsDto } from './dto/shop-profile.dto';
import { normalizeHours } from './shop-hours';

export const INVALID_CONTACT_PHONE = 'Enter a PH mobile number, e.g. 0917 123 4567';

/*
 * The Prisma update for the shared profile fields (onboarding draft and
 * verified-shop PATCH). Only sent fields are written. Throws 400 before any
 * write when the phone or hours fail their cross-field rules.
 */
export function profileFieldsData(dto: ShopProfileFieldsDto): Prisma.ShopUpdateInput {
  let contactPhone: string | undefined;
  if (dto.contactPhone != null) {
    const phone = normalizePhMobile(dto.contactPhone);
    if (!phone) throw new BadRequestException(INVALID_CONTACT_PHONE);
    contactPhone = phone;
  }
  const hours = dto.hours != null ? normalizeHours(dto.hours) : undefined;
  return {
    ...(dto.name != null ? { name: dto.name } : {}),
    ...(dto.address != null ? { address: dto.address } : {}),
    ...(dto.lat != null ? { lat: new Prisma.Decimal(dto.lat) } : {}),
    ...(dto.lng != null ? { lng: new Prisma.Decimal(dto.lng) } : {}),
    ...(contactPhone != null ? { contactPhone } : {}),
    ...(dto.description != null ? { description: dto.description.trim() || null } : {}),
    ...(hours != null ? { hours: hours as unknown as Prisma.InputJsonValue } : {}),
    ...(dto.expressSlotsPerDay != null ? { expressSlotsPerDay: dto.expressSlotsPerDay } : {}),
  };
}
