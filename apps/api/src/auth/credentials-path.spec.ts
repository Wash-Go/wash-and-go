import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { apiRoot, credentialsFileProblem, resolveCredentialsPath } from './credentials-path';

describe('apiRoot', () => {
  const API = resolve(__dirname, '../..'); // apps/api

  it('finds apps/api from src/auth (ts-jest)', () => {
    expect(apiRoot(__dirname, {})).toBe(API);
  });

  it('finds apps/api from dist/src/auth (runtime layout)', () => {
    expect(apiRoot(join(API, 'dist/src/auth'), {})).toBe(API);
  });

  it('honours an API_ROOT override', () => {
    expect(apiRoot(__dirname, { API_ROOT: '/srv/api' })).toBe('/srv/api');
  });

  it('falls back to the start dir when no API package.json is found', () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-pkg-'));
    expect(apiRoot(dir, {})).toBe(dir);
  });
});

describe('resolveCredentialsPath', () => {
  it('resolves a relative path against the API root, not cwd', () => {
    expect(resolveCredentialsPath('./firebase-service-account.json', '/repo/apps/api')).toBe(
      '/repo/apps/api/firebase-service-account.json',
    );
    expect(resolveCredentialsPath('secrets/sa.json', '/repo/apps/api')).toBe(
      '/repo/apps/api/secrets/sa.json',
    );
  });

  it('leaves an absolute path unchanged', () => {
    expect(resolveCredentialsPath('/etc/sa.json', '/repo/apps/api')).toBe('/etc/sa.json');
  });
});

describe('credentialsFileProblem', () => {
  const dir = mkdtempSync(join(tmpdir(), 'creds-'));
  const file = join(dir, 'sa.json');
  writeFileSync(file, '{"secret":"never-logged"}');
  mkdirSync(join(dir, 'a-dir'));

  it('null for an existing file', () => {
    expect(credentialsFileProblem(file)).toBeNull();
  });

  it('names a missing path (absolute), never contents', () => {
    const msg = credentialsFileProblem(join(dir, 'missing.json'));
    expect(msg).toBe(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${join(dir, 'missing.json')}`);
  });

  it('names a directory as not a file', () => {
    expect(credentialsFileProblem(join(dir, 'a-dir'))).toBe(
      `GOOGLE_APPLICATION_CREDENTIALS is not a file: ${join(dir, 'a-dir')}`,
    );
  });
});
