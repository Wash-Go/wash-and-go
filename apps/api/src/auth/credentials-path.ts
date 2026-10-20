import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';

const API_PACKAGE = '@wash-and-go/api';

/*
 * The API package root (the directory holding apps/api/package.json), found by
 * walking up from `fromDir` — works from src/auth under ts-jest and from
 * dist/src/auth at runtime. API_ROOT overrides; falls back to `fromDir`.
 */
export function apiRoot(
  fromDir: string = __dirname,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.API_ROOT) return env.API_ROOT;
  let dir = fromDir;
  for (;;) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if ((JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }).name === API_PACKAGE) {
          return dir;
        }
      } catch {
        // unreadable package.json — keep walking
      }
    }
    const up = dirname(dir);
    if (up === dir) return fromDir;
    dir = up;
  }
}

// GOOGLE_APPLICATION_CREDENTIALS as written in apps/api/.env is relative to
// apps/api, not to wherever the process was launched from.
export function resolveCredentialsPath(p: string, root: string): string {
  return isAbsolute(p) ? p : resolve(root, p);
}

// null when `abs` is a readable-looking file; otherwise a message naming the
// absolute path (never the contents).
export function credentialsFileProblem(abs: string): string | null {
  try {
    if (statSync(abs).isFile()) return null;
    return `GOOGLE_APPLICATION_CREDENTIALS is not a file: ${abs}`;
  } catch {
    return `GOOGLE_APPLICATION_CREDENTIALS file not found: ${abs}`;
  }
}
