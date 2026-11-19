import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Shop, ShopMember, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ShopMemberView } from './shop-staff.service';

// An invite that is neither accepted nor revoked.
const OPEN = { acceptedAt: null, revokedAt: null };

export const INVITE_NOT_FOUND = 'Invite not found';
export const ONE_SHOP_PER_ACCOUNT =
  'One shop per account for now — this account already belongs to a shop';

export interface PendingInviteView {
  id: string;
  shopName: string;
  invitedByName: string;
  createdAt: string;
}

export type AcceptedMemberView = ShopMemberView & {
  shopId: string;
  shopName: string;
};

/*
 * Explicit staff-invite acceptance (GET /shop/invites/pending, POST
 * /shop/invites/:id/accept). It is a privilege grant driven by email, so:
 *
 *  - matching uses ONLY the caller's stored User.email, which POST
 *    /auth/session writes solely from a verified token email from a provider
 *    that proves ownership (VerifiedEmailService). Never a request field.
 *  - an invite that is unknown, revoked, accepted, or for another email is the
 *    same 404, so the endpoint can't probe other people's invites.
 *  - one shop per account for now: an owner, or staff at another shop, is a
 *    409. That check runs inside the transaction after locking the User row,
 *    so two parallel accepts by one user serialize.
 *  - the claim is conditional on the invite still being open (count must be
 *    1), so a concurrent revoke or a replay can't double-grant; SHOP_STAFF is
 *    added by one conditional array_append.
 */
@Injectable()
export class ShopInviteAcceptanceService {
  private readonly logger = new Logger('ShopInvites');

  constructor(private readonly prisma: PrismaService) {}

  async pending(user: User): Promise<PendingInviteView[]> {
    if (!user.email) return [];
    const rows = await this.prisma.shopInvite.findMany({
      where: { email: user.email, ...OPEN },
      include: { shop: true, invitedBy: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((i) => ({
      id: i.id,
      shopName: i.shop.name,
      invitedByName: i.invitedBy.displayName,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  async accept(user: User, inviteId: string): Promise<AcceptedMemberView> {
    const email = user.email;
    if (!email) throw new NotFoundException(INVITE_NOT_FOUND);

    // Replay by the user who accepted it, while still a member: return the
    // same member view (idempotent 200). Anyone else, or after removal, falls
    // through to the open-invite path and gets the usual 404.
    const prior = await this.prisma.shopInvite.findFirst({
      where: { id: inviteId, email, acceptedUserId: user.id, revokedAt: null },
    });
    if (prior?.acceptedAt) {
      const row = await this.prisma.shopMember.findUnique({
        where: { shopId_userId: { shopId: prior.shopId, userId: user.id } },
        include: { user: true, shop: true },
      });
      if (row) return memberView(row);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize this user's accepts so the one-shop check below holds.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

      const invite = await tx.shopInvite.findFirst({
        where: { id: inviteId, email, ...OPEN },
      });
      if (!invite) throw new NotFoundException(INVITE_NOT_FOUND);

      const memberships = await tx.shopMember.findMany({
        where: { userId: user.id },
      });
      if (memberships.some((m) => m.role === 'OWNER' || m.shopId !== invite.shopId)) {
        throw new ConflictException(ONE_SHOP_PER_ACCOUNT);
      }

      const claim = await tx.shopInvite.updateMany({
        where: { id: invite.id, email, ...OPEN },
        data: { acceptedAt: new Date(), acceptedUserId: user.id },
      });
      if (claim.count !== 1) throw new NotFoundException(INVITE_NOT_FOUND);

      const member =
        memberships.find((m) => m.shopId === invite.shopId) ??
        (await tx.shopMember.create({
          data: { shopId: invite.shopId, userId: user.id, role: 'STAFF' },
        }));
      await tx.$executeRaw`UPDATE "User" SET roles = array_append(roles, 'SHOP_STAFF'::"UserRole") WHERE id = ${user.id} AND NOT ('SHOP_STAFF'::"UserRole" = ANY(roles))`;

      const row = await tx.shopMember.findUnique({
        where: { id: member.id },
        include: { user: true, shop: true },
      });
      return { inviteId: invite.id, row: row! };
    });

    const { row } = result;
    this.logger.log({
      event: 'shop.invite.accepted',
      shopId: row.shopId,
      actorUserId: user.id,
      inviteId: result.inviteId,
      memberId: row.id,
    });
    return memberView(row);
  }
}

function memberView(
  row: ShopMember & {
    user: Pick<User, 'displayName' | 'email'>;
    shop: Pick<Shop, 'name'>;
  },
): AcceptedMemberView {
  return {
    id: row.id,
    userId: row.userId,
    role: row.role,
    name: row.user.displayName,
    email: row.user.email,
    joinedAt: row.createdAt.toISOString(),
    shopId: row.shopId,
    shopName: row.shop.name,
  };
}
