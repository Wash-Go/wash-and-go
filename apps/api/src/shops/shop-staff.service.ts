import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ShopInvite } from '@prisma/client';
import { isP2002 } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { ShopAccessService } from './shop-access.service';

export const MAX_OPEN_INVITES = 20;

// Members list row. No phone numbers of other members, ever.
export interface ShopMemberView {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string | null;
  joinedAt: string;
}

export interface ShopInviteView {
  id: string;
  email: string;
  createdAt: string;
}

// An invite that is neither accepted nor revoked.
const OPEN = { acceptedAt: null, revokedAt: null };

export const normalizeInviteEmail = (email: string) => email.trim().toLowerCase();

/*
 * Staff management for the caller's shop (portal B4 "Staff" screen). Members
 * list is OWNER or STAFF; invites and removals are OWNER-only. An invite is
 * accepted on the invitee's next sign-in (ShopInviteAcceptanceService) — this
 * service never grants membership itself.
 */
@Injectable()
export class ShopStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ShopAccessService,
  ) {}

  async listMembers(userId: string): Promise<ShopMemberView[]> {
    const { shopId } = await this.access.membership(userId);
    const rows = await this.prisma.shopMember.findMany({
      where: { shopId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      name: m.user.displayName,
      email: m.user.email,
      joinedAt: m.createdAt.toISOString(),
    }));
  }

  async createInvite(userId: string, rawEmail: string): Promise<ShopInviteView> {
    const { shopId } = await this.access.ownerMembership(userId, 'invite staff');
    const email = normalizeInviteEmail(rawEmail);

    const users = await this.prisma.user.findMany({ where: { email }, select: { id: true } });
    if (users.length) {
      const member = await this.prisma.shopMember.findFirst({
        where: { shopId, userId: { in: users.map((u) => u.id) } },
      });
      if (member) throw new ConflictException('That person is already on your team');
    }

    const existing = await this.prisma.shopInvite.findUnique({
      where: { shopId_email: { shopId, email } },
    });
    if (existing && !existing.acceptedAt && !existing.revokedAt) {
      throw new ConflictException('That email already has an open invite');
    }
    const open = await this.prisma.shopInvite.count({ where: { shopId, ...OPEN } });
    if (open >= MAX_OPEN_INVITES) {
      throw new BadRequestException(
        `You can have at most ${MAX_OPEN_INVITES} open invites — revoke one first`,
      );
    }

    // One row per (shop, email): a revoked or accepted-then-removed invite is
    // reopened, so its history row is reused rather than duplicated.
    const invite = existing
      ? await this.prisma.shopInvite.update({
          where: { id: existing.id },
          data: {
            ...OPEN,
            acceptedUserId: null,
            invitedByUserId: userId,
            createdAt: new Date(),
          },
        })
      : await this.prisma.shopInvite
          .create({ data: { shopId, email, role: 'STAFF', invitedByUserId: userId } })
          .catch((e: unknown) => {
            if (isP2002(e)) throw new ConflictException('That email already has an open invite');
            throw e;
          });
    return shapeInvite(invite);
  }

  async listInvites(userId: string): Promise<ShopInviteView[]> {
    const { shopId } = await this.access.ownerMembership(userId, 'manage invites');
    const rows = await this.prisma.shopInvite.findMany({
      where: { shopId, ...OPEN },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(shapeInvite);
  }

  async revokeInvite(userId: string, inviteId: string): Promise<void> {
    const { shopId } = await this.access.ownerMembership(userId, 'manage invites');
    // Conditional on still-open AND this shop, so it can't race an accept or
    // touch another shop's invite.
    const { count } = await this.prisma.shopInvite.updateMany({
      where: { id: inviteId, shopId, ...OPEN },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Open invite not found');
  }

  async removeMember(userId: string, memberId: string): Promise<void> {
    const { shopId } = await this.access.ownerMembership(userId, 'remove staff');
    const target = await this.prisma.shopMember.findUnique({ where: { id: memberId } });
    if (!target || target.shopId !== shopId) throw new NotFoundException('Member not found');
    if (target.userId === userId) throw new BadRequestException('You can’t remove yourself');
    if (target.role !== 'STAFF') throw new BadRequestException('Only staff members can be removed');

    await this.prisma.$transaction(async (tx) => {
      await tx.shopMember.delete({ where: { id: target.id } });
      // Drop the coarse SHOP_STAFF role once they are staff nowhere.
      const stillStaff = await tx.shopMember.count({
        where: { userId: target.userId, role: 'STAFF' },
      });
      if (stillStaff === 0) {
        const u = await tx.user.findUnique({ where: { id: target.userId } });
        if (u && u.roles.includes('SHOP_STAFF')) {
          await tx.user.update({
            where: { id: u.id },
            data: { roles: u.roles.filter((r) => r !== 'SHOP_STAFF') },
          });
        }
      }
    });
  }
}

function shapeInvite(i: ShopInvite): ShopInviteView {
  return { id: i.id, email: i.email, createdAt: i.createdAt.toISOString() };
}
