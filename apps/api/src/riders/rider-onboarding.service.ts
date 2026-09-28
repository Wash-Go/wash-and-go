import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RiderProfile, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOwnedKey } from '../uploads/object-key';
import type { UpdateRiderOnboardingDto } from './dto/rider-onboarding.dto';

// Rider's own onboarding view.
export interface RiderProfileView {
  id: string;
  status: string;
  rejectionReason: string | null;
  licenseKey: string | null;
  idKey: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
}

/*
 * Self-serve rider onboarding (checkpoint D backend, mirror of ShopOnboarding).
 * A signed-in user starts a DRAFT profile (granted RIDER), submits documents,
 * then an admin verifies. Only VERIFIED riders are dispatchable.
 */
@Injectable()
export class RiderOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(user: User): Promise<RiderProfileView | null> {
    const profile = await this.prisma.riderProfile.findUnique({ where: { userId: user.id } });
    return profile ? this.shape(profile) : null;
  }

  async start(user: User): Promise<RiderProfileView> {
    const existing = await this.prisma.riderProfile.findUnique({ where: { userId: user.id } });
    if (existing) return this.shape(existing);

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.riderProfile.create({ data: { userId: user.id } });
      const roles = [...new Set([...user.roles, 'RIDER' as const])];
      await tx.user.update({ where: { id: user.id }, data: { roles } });
      return created;
    });
    return this.shape(profile);
  }

  async update(user: User, dto: UpdateRiderOnboardingDto): Promise<RiderProfileView> {
    const profile = await this.mustOwn(user.id);
    if (profile.status === 'SUBMITTED' || profile.status === 'VERIFIED') {
      throw new ConflictException(
        profile.status === 'SUBMITTED'
          ? 'Your application is under review and can’t be edited'
          : 'Your profile is verified',
      );
    }
    if (dto.licenseKey != null) assertOwnedKey(user.id, dto.licenseKey);
    if (dto.idKey != null) assertOwnedKey(user.id, dto.idKey);

    const updated = await this.prisma.riderProfile.update({
      where: { userId: user.id },
      data: {
        ...(dto.licenseKey != null ? { licenseKey: dto.licenseKey } : {}),
        ...(dto.idKey != null ? { idKey: dto.idKey } : {}),
        ...(dto.vehicleType != null ? { vehicleType: dto.vehicleType } : {}),
        ...(dto.vehiclePlate != null ? { vehiclePlate: dto.vehiclePlate } : {}),
      },
    });
    return this.shape(updated);
  }

  async submit(user: User): Promise<RiderProfileView> {
    const profile = await this.mustOwn(user.id);
    if (profile.status === 'SUBMITTED') throw new ConflictException('Already submitted');
    if (profile.status === 'VERIFIED') throw new ConflictException('Already verified');
    const missing: string[] = [];
    if (!profile.licenseKey) missing.push('driver’s license');
    if (!profile.idKey) missing.push('valid ID');
    if (!profile.vehicleType) missing.push('vehicle type');
    if (!profile.vehiclePlate) missing.push('plate number');
    if (missing.length) throw new BadRequestException(`Please add: ${missing.join(', ')}`);

    const updated = await this.prisma.riderProfile.update({
      where: { userId: user.id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null },
    });
    return this.shape(updated);
  }

  private async mustOwn(userId: string): Promise<RiderProfile> {
    const profile = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Start rider onboarding first');
    return profile;
  }

  private shape(p: RiderProfile): RiderProfileView {
    return {
      id: p.id,
      status: p.status,
      rejectionReason: p.rejectionReason,
      licenseKey: p.licenseKey,
      idKey: p.idKey,
      vehicleType: p.vehicleType,
      vehiclePlate: p.vehiclePlate,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    };
  }
}
