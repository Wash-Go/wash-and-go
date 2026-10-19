import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import withSerwistInit from '@serwist/next';

const here = fileURLToPath(new URL('.', import.meta.url));

// One revision per build for precached routes (the offline page).
function buildRevision() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: here }).toString().trim();
  } catch {
    return randomUUID();
  }
}

// Serwist skips its own public/ glob when additionalPrecacheEntries is set, so
// list public/ here (minus the generated worker files) next to /~offline.
function publicEntries(dir = join(here, 'public')) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...publicEntries(full));
    else if (!/^(sw\.js|swe-worker-.*)(\.map)?$/.test(name)) {
      const revision = createHash('md5').update(readFileSync(full)).digest('hex');
      out.push({ url: `/${relative(join(here, 'public'), full).split('\\').join('/')}`, revision });
    }
  }
  return out;
}

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  register: false, // components/PwaRegister.tsx registers it with the API origin
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/~offline', revision: buildRevision() }, ...publicEntries()],
});

/** @type {import('next').NextConfig} */
export default withSerwist({
  reactStrictMode: true,
  // Workspace TS packages are compiled by Next (no prebuild step).
  transpilePackages: ['@wash-and-go/domain', '@wash-and-go/api-client'],
});
