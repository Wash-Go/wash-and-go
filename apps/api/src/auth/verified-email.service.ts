import { Injectable, Logger } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { VerifiedIdentity } from './firebase.service';

// Sign-in providers whose verified email proves the user owns that address.
// A custom token or an anonymous/phone sign-in can carry an email claim that
// nobody proved, so it never drives a privilege (staff invites).
export const INVITE_EMAIL_PROVIDERS: ReadonlySet<string> = new Set([
  'password',
  'google.com',
  'emailLink',
]);

/*
 * The email from a verified token that may be trusted for invite matching:
 * email_verified === true AND an allowed provider AND a non-blank email.
 * Returned lowercased and trimmed (User.email and ShopInvite.email are both
 * CHECK-lowercase). Null otherwise.
 */
export function trustedEmail(identity: VerifiedIdentity): string | null {
  if (identity.emailVerified !== true) return null;
  if (!identity.signInProvider || !INVITE_EMAIL_PROVIDERS.has(identity.signInProvider)) return null;
  if (typeof identity.email !== 'string') return null;
  const email = identity.email.trim().toLowerCase();
  return email || null;
}

/*
 * POST /auth/session hook: keep User.email in step with the token's trusted
 * email. When the token carries no trusted email the stored one is left
 * untouched. It never grants anything — staff invites are accepted explicitly
 * (POST /shop/invites/:id/accept) — and a failure never blocks sign-in.
 */
@Injectable()
export class VerifiedEmailService {
  private readonly logger = new Logger('VerifiedEmail');

  constructor(private readonly prisma: PrismaService) {}

  async sync(user: User, identity: VerifiedIdentity): Promise<User> {
    if (user.disabledAt) return user;
    const email = trustedEmail(identity);
    if (!email || user.email === email) return user;
    try {
      return await this.prisma.user.update({ where: { id: user.id }, data: { email } });
    } catch (e) {
      // Name/code only: a Prisma message can echo the written email.
      const err = e as Error & { code?: string };
      this.logger.error({ event: 'user.email.sync_failed', userId: user.id, error: err.code ?? err.name });
      return user;
    }
  }
}
