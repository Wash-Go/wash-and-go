import { Logger } from '@nestjs/common';
import type { UploadsService } from '../uploads/uploads.service';

const logger = new Logger('ShopLogo');

/*
 * The logo's presigned GET (5 min) for an owner/staff view, or null when there
 * is no key or R2 isn't configured. Never throws: a presign failure is logged
 * and degrades to null so a profile read can't fail on the logo. Callers have
 * already scoped the shop to the caller's membership, so presignGet (no
 * per-caller prefix check) is correct here — staff read the owner's key.
 */
export async function logoUrlFor(
  uploads: Pick<UploadsService, 'configured' | 'presignGet'>,
  key: string | null | undefined,
): Promise<string | null> {
  if (!key || !uploads.configured()) return null;
  try {
    return (await uploads.presignGet(key)).url;
  } catch (e) {
    logger.warn({ event: 'shop.logo.presign_failed', error: (e as Error).message });
    return null;
  }
}
