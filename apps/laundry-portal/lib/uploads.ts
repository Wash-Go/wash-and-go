// Wizard step 5 (documents) when R2 is configured: check the file, presign,
// PUT it straight to storage, keep the key for PATCH /shop/onboarding.
// Pure (the network is injected) so the upload path is jest-tested.

export const PERMIT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PHOTOS = 8;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadKind = 'permit' | 'photo';

export function checkUploadFile(file: { type: string; size: number }, kind: UploadKind): string | null {
  const types: readonly string[] = kind === 'permit' ? PERMIT_TYPES : PHOTO_TYPES;
  if (!types.includes(file.type)) return kind === 'permit' ? 'Use a JPG, PNG, WebP or PDF file.' : 'Use a JPG, PNG or WebP photo.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That file is over 10 MB. Try a smaller photo.';
  return null;
}

export type UploadDeps = {
  presign: (contentType: string) => Promise<{ key: string; putUrl: string }>;
  put: (
    url: string,
    init: { method: 'PUT'; headers: Record<string, string>; body: Blob },
  ) => Promise<{ ok: boolean; status: number }>;
};

export async function uploadDocument(file: Blob, deps: UploadDeps): Promise<string> {
  const { key, putUrl } = await deps.presign(file.type);
  const res = await deps.put(putUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return key;
}

export function addPhotoKey(keys: readonly string[], key: string): string[] {
  if (keys.includes(key) || keys.length >= MAX_PHOTOS) return [...keys];
  return [...keys, key];
}

export function removeKey(keys: readonly string[], key: string): string[] {
  return keys.filter((k) => k !== key);
}
