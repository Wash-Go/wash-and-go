import { BadRequestException } from '@nestjs/common';
import { assertOwnedImageKey, assertOwnedKey } from './object-key';

/*
 * Keys a caller puts on their record (permit, photos, rider docs, logo) are
 * later presigned for an admin or shop member, so they must name exactly one
 * object directly under the caller's own prefix — no path tricks that a
 * prefix-only check would let through.
 */
describe('assertOwnedKey', () => {
  it.each([
    'uploads/u1/3f2a9c1e-77b0-4c1d-9e1a-0a1b2c3d4e5f.png',
    'uploads/u1/permit.pdf',
    'uploads/u1/a_b-c.d.webp',
  ])('accepts %s', (key) => {
    expect(() => assertOwnedKey('u1', key)).not.toThrow();
  });

  it.each([
    ['another user', 'uploads/u2/x.png'],
    ['a user whose id starts with mine', 'uploads/u10/x.png'],
    ['dot-dot into another prefix', 'uploads/u1/../u2/x.png'],
    ['a dot-dot file name', 'uploads/u1/..'],
    ['a single-dot segment', 'uploads/u1/./x.png'],
    ['a hidden-file name', 'uploads/u1/.x.png'],
    ['a double slash', 'uploads/u1//x.png'],
    ['a backslash', 'uploads/u1/..\\u2\\x.png'],
    ['an extra path segment', 'uploads/u1/sub/x.png'],
    ['an empty file name', 'uploads/u1/'],
    ['no uploads/ root', 'u1/x.png'],
    ['a leading slash', '/uploads/u1/x.png'],
    ['a URL', 'https://evil.example/uploads/u1/x.png'],
    ['a space', 'uploads/u1/x y.png'],
    ['a NUL byte', 'uploads/u1/x.png\u0000.pdf'],
  ])('rejects %s (%s)', (_l, key) => {
    expect(() => assertOwnedKey('u1', key)).toThrow(
      new BadRequestException('Upload key does not belong to you'),
    );
  });

  it('treats regex characters in the user id literally', () => {
    expect(() => assertOwnedKey('u.1', 'uploads/uX1/x.png')).toThrow(BadRequestException);
    expect(() => assertOwnedKey('u.1', 'uploads/u.1/x.png')).not.toThrow();
  });
});

describe('assertOwnedImageKey inherits the strict path rule', () => {
  it('rejects a dot-dot logo key even with an image extension', () => {
    expect(() => assertOwnedImageKey('u1', 'uploads/u1/../u2/logo.png')).toThrow(
      'Upload key does not belong to you',
    );
  });
});
