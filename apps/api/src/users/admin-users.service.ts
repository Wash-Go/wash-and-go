import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';
import { UsersRepository } from './users.repository';

// Shaped user for the admin directory (no Firebase internals beyond the uid).
export interface AdminUserView {
  id: string;
  firebaseUid: string;
  phone: string;
  displayName: string;
  roles: UserRole[];
  disabledAt: string | null;
  createdAt: string;
}

/*
 * Admin user administration (checkpoint O). Unblocks onboarding of non-customer
 * actors: a person signs in (becomes a CUSTOMER), then an admin grants the RIDER
 * / SHOP_OWNER / SHOP_STAFF / ADMIN role here. Also enable/disable accounts —
 * User.disabledAt is honored by auth but nothing set it before now.
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly repo: UsersRepository) {}

  async list(filter: { role?: UserRole; q?: string }): Promise<AdminUserView[]> {
    const users = await this.repo.listUsers(filter);
    return users.map((u) => this.shape(u));
  }

  async setRoles(
    actor: User,
    userId: string,
    roles: UserRole[],
  ): Promise<AdminUserView> {
    const unique = [...new Set(roles)];
    if (unique.length === 0) {
      throw new BadRequestException('At least one role is required');
    }
    const target = await this.repo.findById(userId);
    if (!target) throw new NotFoundException('User not found');
    // Guard self-lockout: an admin can't strip their own ADMIN role.
    if (
      actor.id === userId &&
      target.roles.includes('ADMIN') &&
      !unique.includes('ADMIN')
    ) {
      throw new BadRequestException('You cannot remove your own ADMIN role');
    }
    return this.shape(await this.repo.updateRoles(userId, unique));
  }

  async setDisabled(
    actor: User,
    userId: string,
    disabled: boolean,
  ): Promise<AdminUserView> {
    if (disabled && actor.id === userId) {
      throw new ForbiddenException('You cannot disable your own account');
    }
    const target = await this.repo.findById(userId);
    if (!target) throw new NotFoundException('User not found');
    return this.shape(
      await this.repo.setDisabledAt(userId, disabled ? new Date() : null),
    );
  }

  private shape(u: User): AdminUserView {
    return {
      id: u.id,
      firebaseUid: u.firebaseUid,
      phone: u.phone,
      displayName: u.displayName,
      roles: u.roles,
      disabledAt: u.disabledAt ? u.disabledAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
