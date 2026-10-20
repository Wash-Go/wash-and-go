import { BadRequestException } from '@nestjs/common';
import { IMAGE_KEY_EXTENSIONS } from './uploads.service';

// R2 upload keys are namespaced `uploads/<userId>/…` (see UploadsService). When a
// caller submits a key onto their record (shop permit, rider docs), enforce that
// it lives under THEIR prefix — so a crafted key can't point the admin's
// presigned-GET at another user's private object.
export function assertOwnedKey(userId: string, key: string): void {
  if (!key.startsWith(`uploads/${userId}/`)) {
    throw new BadRequestException('Upload key does not belong to you');
  }
}

// A caller-owned key that is also an image from the presign allowlist (jpg,
// png, webp — not PDF), judged by the extension presignUpload gave it.
export function assertOwnedImageKey(userId: string, key: string): void {
  assertOwnedKey(userId, key);
  const ext = /\.([a-z0-9]+)$/i.exec(key)?.[1]?.toLowerCase();
  if (!ext || !IMAGE_KEY_EXTENSIONS.includes(ext)) {
    throw new BadRequestException('A logo must be a JPG, PNG or WebP image');
  }
}
