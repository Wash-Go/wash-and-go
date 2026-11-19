import 'reflect-metadata';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

const R2_ENV = {
  R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'ak',
  R2_SECRET_ACCESS_KEY: 'sk',
  R2_BUCKET: 'washgo',
};

// GET /uploads/status lets the portal wizard gate the documents step without
// firing a presign call that would 503.
describe('UploadsController.status', () => {
  const saved = { ...process.env };
  afterEach(() => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k];
    Object.assign(process.env, saved);
  });

  it('reports configured: false when R2 env is missing', () => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k];
    expect(new UploadsController(new UploadsService()).status()).toEqual({ configured: false });
  });

  it('reports configured: false when R2 env is only partly set', () => {
    for (const k of Object.keys(R2_ENV)) delete process.env[k];
    process.env.R2_ENDPOINT = R2_ENV.R2_ENDPOINT;
    expect(new UploadsController(new UploadsService()).status()).toEqual({ configured: false });
  });

  it('reports configured: true when every R2 var is set', () => {
    Object.assign(process.env, R2_ENV);
    expect(new UploadsController(new UploadsService()).status()).toEqual({ configured: true });
  });
});
