import { BadRequestException } from '@nestjs/common';
import { IMAGE_KEY_EXTENSIONS } from './uploads.service';

// R2 upload keys are namespaced `uploads/<userId>/…` (see UploadsService). When a
// caller submits a key onto their record (shop permit, rider docs), enforce that
// it lives under THEIR prefix — so a crafted key can't point the admin's
// presigned-GET at another user's private object.
//
// Strict, not a prefix check: the whole key must be `uploads/<userId>/<name>`
// with ONE file name of [A-Za-z0-9._-] that doesn't start with a dot. That
// refuses `..`/`.` segments, `//`, backslashes, extra segments, URLs and
// control characters (`uploads/<me>/../<other>/x` passes a startsWith).
const FILE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export function assertOwnedKey(userId: string, key: string): void {
  const prefix = `uploads/${userId}/`;
  const name = key.startsWith(prefix) ? key.slice(prefix.length) : null;
  if (name === null || !FILE_NAME.test(name)) {
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
