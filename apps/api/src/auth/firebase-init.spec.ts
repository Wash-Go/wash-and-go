import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// The Admin SDK is mocked: these specs cover how FirebaseService picks and
// checks its credentials at boot, not Google's auth library.
const applicationDefault = jest.fn(() => ({ kind: 'adc' }));
const cert = jest.fn((_json: unknown) => ({ kind: 'cert' }));
const initializeApp = jest.fn((_opts: unknown) => ({ auth: () => ({}) }));
jest.mock('firebase-admin', () => ({
  apps: [],
  app: jest.fn(),
  credential: { applicationDefault: () => applicationDefault(), cert: (j: unknown) => cert(j) },
  initializeApp: (o: unknown) => initializeApp(o),
}));

import { FirebaseService } from './firebase.service';

const API = resolve(__dirname, '../..');

function svc(env: Record<string, string | undefined>) {
  return new FirebaseService({ get: (k: string) => env[k] } as unknown as ConfigService);
}

describe('FirebaseService.onModuleInit credentials', () => {
  const saved = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let warn: jest.SpyInstance;
  const dir = mkdtempSync(join(tmpdir(), 'fb-'));
  const realFile = join(dir, 'sa.json');
  writeFileSync(realFile, '{"private_key":"SECRET-KEY-MATERIAL"}');

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    if (saved === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = saved;
  });

  it('absolute existing path: unchanged, exported to the SDK before applicationDefault()', () => {
    let seen: string | undefined;
    applicationDefault.mockImplementationOnce(() => {
      seen = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      return { kind: 'adc' };
    });
    svc({
      NODE_ENV: 'development',
      AUTH_DEV_BYPASS: '0',
      GOOGLE_APPLICATION_CREDENTIALS: realFile,
    }).onModuleInit();
    expect(seen).toBe(realFile);
    expect(initializeApp).toHaveBeenCalled();
  });

  it('relative path: resolved against apps/api (not cwd) before the SDK sees it', () => {
    // A relative path from apps/api to the temp file.
    const rel = require('path').relative(API, realFile) as string;
    let seen: string | undefined;
    applicationDefault.mockImplementationOnce(() => {
      seen = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      return { kind: 'adc' };
    });
    const cwd = process.cwd();
    process.chdir(tmpdir()); // launched from somewhere else
    try {
      svc({
        NODE_ENV: 'development',
        AUTH_DEV_BYPASS: '0',
        GOOGLE_APPLICATION_CREDENTIALS: rel,
      }).onModuleInit();
    } finally {
      process.chdir(cwd);
    }
    expect(seen).toBe(realFile);
  });

  it('missing file under dev bypass: one warning with the absolute path, Admin init skipped', () => {
    const s = svc({
      NODE_ENV: 'development',
      AUTH_DEV_BYPASS: '1',
      GOOGLE_APPLICATION_CREDENTIALS: './nope.json',
    });
    expect(() => s.onModuleInit()).not.toThrow();
    expect(applicationDefault).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
    const msgs = warn.mock.calls.map((c) => String(c[0]));
    expect(msgs.filter((m) => m.includes(join(API, 'nope.json')))).toHaveLength(1);
    expect(msgs.join(' ')).toMatch(/x-dev-uid only/);
  });

  it('missing file without bypass: throws at boot with the absolute path', () => {
    const s = svc({
      NODE_ENV: 'production',
      AUTH_DEV_BYPASS: '0',
      GOOGLE_APPLICATION_CREDENTIALS: './nope.json',
    });
    expect(() => s.onModuleInit()).toThrow(
      `GOOGLE_APPLICATION_CREDENTIALS file not found: ${join(API, 'nope.json')}`,
    );
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('a directory instead of a file is refused the same way', () => {
    const s = svc({
      NODE_ENV: 'production',
      AUTH_DEV_BYPASS: '0',
      GOOGLE_APPLICATION_CREDENTIALS: dir,
    });
    expect(() => s.onModuleInit()).toThrow(/is not a file/);
  });

  it('never logs the file contents', () => {
    svc({
      NODE_ENV: 'development',
      AUTH_DEV_BYPASS: '1',
      GOOGLE_APPLICATION_CREDENTIALS: realFile,
    }).onModuleInit();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET-KEY-MATERIAL');
  });

  it('FIREBASE_SERVICE_ACCOUNT_JSON wins as before; the file path is not checked or exported', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'untouched';
    svc({
      NODE_ENV: 'production',
      AUTH_DEV_BYPASS: '0',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"p"}',
      GOOGLE_APPLICATION_CREDENTIALS: './nope.json',
    }).onModuleInit();
    expect(cert).toHaveBeenCalledWith({ project_id: 'p' });
    expect(applicationDefault).not.toHaveBeenCalled();
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('untouched');
  });
});
