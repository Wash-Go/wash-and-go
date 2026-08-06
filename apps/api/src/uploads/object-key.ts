import { BadRequestException } from '@nestjs/common';

// R2 upload keys are namespaced `uploads/<userId>/…` (see UploadsService). When a
// caller submits a key onto their record (shop permit, rider docs), enforce that
// it lives under THEIR prefix — so a crafted key can't point the admin's
// presigned-GET at another user's private object.
export function assertOwnedKey(userId: string, key: string): void {
  if (!key.startsWith(`uploads/${userId}/`)) {
    throw new BadRequestException('Upload key does not belong to you');
  }
}
