#!/usr/bin/env node
// The standalone demo build's smoke (B10), one command:
//   pnpm --filter @wash-and-go/e2e smoke:portal-demo
// 1. Builds the portal WITHOUT the demo flag into .next-e2e and fails if any
//    demo marker (the state key, the session key, the demo API base) is in
//    the output: the demo code must not ship in normal builds.
// 2. Builds the demo (NEXT_PUBLIC_DEMO=1) into the same folder.
// 3. Runs playwright.demo.config.ts, which serves that build on :3010 (no API).
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const DIST = process.env.NEXT_DIST_DIR || '.next-e2e'
const OUT = path.join(ROOT, 'apps', 'laundry-portal', DIST)
const MARKERS = ['wg-demo-state', 'wg-demo-session', 'demo-api.washandgo.invalid']

function run(cmd, args, env = {}, cwd = ROOT) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd, env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function filesWith(dir, needle) {
  const hits = []
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) hits.push(...filesWith(p, needle))
    else if (/\.(js|html|json|rsc|txt|map)$/.test(name.name) && fs.readFileSync(p, 'utf8').includes(needle)) hits.push(p)
  }
  return hits
}

console.log('[demo-smoke] plain build (no demo flag)')
run('pnpm', ['--filter', '@wash-and-go/laundry-portal', 'build'], { NEXT_DIST_DIR: DIST, NEXT_PUBLIC_DEMO: '' })
for (const m of MARKERS) {
  const hits = filesWith(OUT, m)
  console.log(`[demo-smoke] plain build files containing "${m}": ${hits.length}`)
  if (hits.length) {
    console.error(hits.join('\n'))
    process.exit(1)
  }
}
console.log('[demo-smoke] demo build')
run('pnpm', ['--filter', '@wash-and-go/laundry-portal', 'build'], { NEXT_DIST_DIR: DIST, NEXT_PUBLIC_DEMO: '1' })
run('npx', ['playwright', 'test', '--config', 'playwright.demo.config.ts'], {}, path.join(ROOT, 'e2e'))
