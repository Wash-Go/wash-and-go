import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IMAGE_KEY_EXTENSIONS, UploadsService } from './uploads.service';
import { assertOwnedImageKey } from './object-key';

// Mock only the signer — S3Client/command construction is pure + offline.
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://r2.example/signed'),
}));

const R2_ENV = {
  R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'ak',
  R2_SECRET_ACCESS_KEY: 'sk',
  R2_BUCKET: 'washgo',
};

describe('UploadsService', () => {
  let svc: UploadsService;
  const saved = { ...process.env };

  beforeEach(() => {
    svc = new UploadsService();
  });
  afterEach(() => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k as keyof typeof R2_ENV];
    Object.assign(process.env, saved);
  });

  const withEnv = () => Object.assign(process.env, R2_ENV);

  it('configured() reflects R2 env presence', () => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k as keyof typeof R2_ENV];
    expect(svc.configured()).toBe(false);
    withEnv();
    expect(svc.configured()).toBe(true);
  });

  it('presignUpload rejects an unsupported content-type before touching R2', async () => {
    withEnv();
    await expect(svc.presignUpload('u1', 'application/zip')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('presignUpload namespaces the key by user id and returns a put URL', async () => {
    withEnv();
    const { key, putUrl } = await svc.presignUpload('u1', 'image/png');
    expect(key).toMatch(/^uploads\/u1\/[0-9a-f-]+\.png$/);
    expect(putUrl).toBe('https://r2.example/signed');
  });

  it('presignUpload 503s when R2 is not configured (ships inert)', async () => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k as keyof typeof R2_ENV];
    await expect(svc.presignUpload('u1', 'image/png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('presignView forbids a non-owner, non-admin before touching R2', async () => {
    withEnv();
    await expect(
      svc.presignView('uploads/OTHER/x.png', { id: 'u1', roles: ['CUSTOMER'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('presignView allows the owner', async () => {
    withEnv();
    const { url } = await svc.presignView('uploads/u1/x.png', {
      id: 'u1',
      roles: ['CUSTOMER'],
    });
    expect(url).toBe('https://r2.example/signed');
  });

  it('presignView allows an admin to view any object (proof review)', async () => {
    withEnv();
    const { url } = await svc.presignView('uploads/OTHER/x.png', {
      id: 'admin',
      roles: ['ADMIN'],
    });
    expect(url).toBe('https://r2.example/signed');
  });

  // presignGet is presignView minus the per-caller check; callers that have
  // already authorized access (a shop member reading their shop's logo) use it.
  it('presignGet signs a GET for the given key', async () => {
    withEnv();
    expect(await svc.presignGet('uploads/OTHER/x.png')).toEqual({
      url: 'https://r2.example/signed',
    });
  });

  it('presignGet 503s when R2 is not configured', async () => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k as keyof typeof R2_ENV];
    await expect(svc.presignGet('uploads/u1/x.png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('image upload keys (B8 logo)', () => {
  it('IMAGE_KEY_EXTENSIONS is the presign allowlist minus PDF', () => {
    expect([...IMAGE_KEY_EXTENSIONS].sort()).toEqual(['jpg', 'png', 'webp']);
  });

  it.each([
    ['uploads/u1/a.png', true],
    ['uploads/u1/a.jpg', true],
    ['uploads/u1/a.webp', true],
    ['uploads/u1/a.pdf', false],
    ['uploads/u1/a.svg', false],
    ['uploads/u1/a', false],
    ['uploads/u2/a.png', false],
  ])('assertOwnedImageKey(u1, %s) ok=%p', (key, ok) => {
    const run = () => assertOwnedImageKey('u1', key);
    if (ok) expect(run).not.toThrow();
    else expect(run).toThrow(BadRequestException);
  });
});
