import { Injectable, Logger } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { VerifiedIdentity } from '../auth/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeInviteEmail } from './shop-staff.service';

const OPEN = { acceptedAt: null, revokedAt: null };

/*
 * Staff-invite acceptance, run from POST /auth/session (AuthService.
 * sessionUpsert) right after the User upsert. It is a privilege grant driven
 * by email, so:
 *
 *  - the email comes ONLY from the verified Firebase identity, and only when
 *    the token says email_verified === true (an email/password account can be
 *    created for any address without proving ownership). Never a request body.
 *  - matching is exact on the lowercased email (both columns CHECK lowercase).
 *  - each invite is claimed with a conditional update (still open → accepted),
 *    so parallel sessions, a concurrent revoke, or a replay can't double-grant.
 *  - it is idempotent: an existing membership is reused, SHOP_STAFF is added
 *    once, an accepted invite is never re-claimed.
 *  - a user who OWNS a shop is not auto-joined (logged; invite left open).
 *  - a failure never blocks sign-in: it is logged and retried next session.
 *
 * The x-dev-uid stub never reaches here (it carries no email); acceptance
 * needs a real verified token.
 */
@Injectable()
export class ShopInviteAcceptanceService {
  private readonly logger = new Logger('ShopInvites');

  constructor(private readonly prisma: PrismaService) {}

  async onSignIn(user: User, identity: VerifiedIdentity): Promise<User> {
    if (user.disabledAt) return user;
    const email =
      identity.emailVerified === true && typeof identity.email === 'string' && identity.email.trim()
        ? normalizeInviteEmail(identity.email)
        : null;
    try {
      let current = user;
      // Keep User.email in step with the token's VERIFIED email (null when none).
      if (current.email !== email) {
        current = await this.prisma.user.update({ where: { id: user.id }, data: { email } });
      }
      if (!email) return current;

      const invites = await this.prisma.shopInvite.findMany({
        where: { email, ...OPEN },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (!invites.length) return current;

      const owns = await this.prisma.shopMember.count({ where: { userId: user.id, role: 'OWNER' } });
      if (owns > 0) {
        this.logger.warn({
          event: 'shop.invite.skipped_owner',
          userId: user.id,
          inviteIds: invites.map((i) => i.id),
        });
        return current;
      }

      return await this.prisma.$transaction(async (tx) => {
        const accepted: Array<{ inviteId: string; shopId: string }> = [];
        for (const inv of invites) {
          const claim = await tx.shopInvite.updateMany({
            where: { id: inv.id, email, ...OPEN },
            data: { acceptedAt: new Date(), acceptedUserId: user.id },
          });
          if (claim.count === 0) continue; // revoked/accepted meanwhile
          const existing = await tx.shopMember.findUnique({
            where: { shopId_userId: { shopId: inv.shopId, userId: user.id } },
          });
          if (!existing) {
            await tx.shopMember.create({
              data: { shopId: inv.shopId, userId: user.id, role: 'STAFF' },
            });
          }
          accepted.push({ inviteId: inv.id, shopId: inv.shopId });
        }
        const fresh = (await tx.user.findUnique({ where: { id: user.id } })) as User;
        if (!accepted.length) return fresh;
        const updated = fresh.roles.includes('SHOP_STAFF')
          ? fresh
          : await tx.user.update({
              where: { id: user.id },
              data: { roles: [...fresh.roles, 'SHOP_STAFF'] },
            });
        for (const a of accepted) {
          this.logger.log({ event: 'shop.invite.accepted', userId: user.id, ...a });
        }
        return updated;
      });
    } catch (e) {
      this.logger.error(
        { event: 'shop.invite.accept_failed', userId: user.id, error: (e as Error).message },
        (e as Error).stack,
      );
      return user;
    }
  }
}
