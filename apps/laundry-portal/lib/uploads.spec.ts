import { addPhotoKey, checkLogoFile, checkUploadFile, MAX_PHOTOS, MAX_UPLOAD_BYTES, removeKey, uploadDocument } from './uploads';

describe('checkUploadFile', () => {
  it('accepts images and PDFs for the permit', () => {
    expect(checkUploadFile({ type: 'application/pdf', size: 1000 }, 'permit')).toBeNull();
    expect(checkUploadFile({ type: 'image/jpeg', size: 1000 }, 'permit')).toBeNull();
    expect(checkUploadFile({ type: 'image/gif', size: 1000 }, 'permit')).toBe('Use a JPG, PNG, WebP or PDF file.');
  });

  it('accepts only images for storefront photos', () => {
    expect(checkUploadFile({ type: 'image/webp', size: 1000 }, 'photo')).toBeNull();
    expect(checkUploadFile({ type: 'application/pdf', size: 1000 }, 'photo')).toBe('Use a JPG, PNG or WebP photo.');
  });

  it('rejects files over the size cap', () => {
    expect(checkUploadFile({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }, 'photo')).toBe(
      'That file is over 10 MB. Try a smaller photo.',
    );
  });
});

describe('uploadDocument', () => {
  it('presigns, PUTs the file with its type, and returns the key', async () => {
    const presign = jest.fn().mockResolvedValue({ key: 'uploads/u1/a.pdf', putUrl: 'https://r2.test/put?sig=1' });
    const put = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const file = { type: 'application/pdf', size: 10 } as unknown as Blob & { type: string };
    await expect(uploadDocument(file, { presign, put })).resolves.toBe('uploads/u1/a.pdf');
    expect(presign).toHaveBeenCalledWith('application/pdf');
    expect(put).toHaveBeenCalledWith('https://r2.test/put?sig=1', {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: file,
    });
  });

  it('throws when the storage PUT fails', async () => {
    const presign = jest.fn().mockResolvedValue({ key: 'k', putUrl: 'u' });
    const put = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(uploadDocument({ type: 'image/png' } as never, { presign, put })).rejects.toThrow('upload failed (403)');
  });
});

describe('photo keys', () => {
  it('adds up to 8 photos, no duplicates', () => {
    const full = Array.from({ length: MAX_PHOTOS }, (_, i) => `k${i}`);
    expect(addPhotoKey(['a'], 'b')).toEqual(['a', 'b']);
    expect(addPhotoKey(['a'], 'a')).toEqual(['a']);
    expect(addPhotoKey(full, 'x')).toEqual(full);
  });

  it('removes a key', () => {
    expect(removeKey(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('checkLogoFile', () => {
  it('accepts PNG, JPG and WebP up to 2 MB', () => {
    expect(checkLogoFile({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull();
    expect(checkLogoFile({ type: 'image/webp', size: 1000 })).toBeNull();
    expect(checkLogoFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
  });
  it('refuses PDFs, other images and big files with human copy', () => {
    expect(checkLogoFile({ type: 'application/pdf', size: 1000 })).toBe('Use a PNG, JPG or WebP image.');
    expect(checkLogoFile({ type: 'image/gif', size: 1000 })).toBe('Use a PNG, JPG or WebP image.');
    expect(checkLogoFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe('That image is over 2 MB. Try a smaller one.');
  });
});
