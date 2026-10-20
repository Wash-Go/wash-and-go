#!/usr/bin/env node
// Every laundry-portal browser smoke against a production build, one command:
//   pnpm smoke:portal            (from the repo root or e2e/)
//
// 1. API: uses the one on API_URL (default http://localhost:4000) if it
//    answers /health; otherwise builds apps/api if dist is missing and starts
//    it the documented way (cd apps/api, SENTRY_DSN= , the design DB,
//    AUTH_DEV_BYPASS=1, NODE_ENV=development), and stops it at the end.
// 2. Builds the portal for e2e (build:portal-e2e: dev stub + NEXT_PUBLIC_E2E=1,
//    into NEXT_DIST_DIR, default .next-e2e, never the dev server's .next)
//    unless PORTAL_SMOKE_SKIP_BUILD=1, then serves it with `next start` on
//    PORTAL_SMOKE_PORT (default 3012). A busy port aborts: the script never
//    kills a server it did not start.
// 3. Runs the laundry-portal specs in groups (E2E_ONLY=portal, so no other
//    app's dev server starts), waiting out the API's 60/min rate-limit window
//    between groups, then the PWA config, against that build.
// Every server it started is stopped by its own pid, also on Ctrl-C.
const net = require('node:net')
const path = require('node:path')
const fs = require('node:fs')
const { spawn, spawnSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const E2E = path.join(ROOT, 'e2e')
const API_DIR = path.join(ROOT, 'apps', 'api')
const PORTAL_DIR = path.join(ROOT, 'apps', 'laundry-portal')
const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')
const PORT = Number(process.env.PORTAL_SMOKE_PORT || 3012)
const PORTAL = `http://localhost:${PORT}`
// The smoke build lives in its own dist dir so it never overwrites the .next a
// running `next dev` uses; build:portal-e2e and `next start` read the same value.
const DIST_DIR = process.env.NEXT_DIST_DIR || '.next-e2e'
const DB = process.env.E2E_DATABASE_URL || 'postgresql://ban@localhost:5432/wash_and_go_design'

const started = []

function stopAll() {
  for (const child of started.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue
    try {
      process.kill(-child.pid, 'SIGTERM') // its own process group
    } catch {
      child.kill('SIGTERM')
    }
  }
  started.length = 0
}
process.on('SIGINT', () => { stopAll(); process.exit(130) })
process.on('SIGTERM', () => { stopAll(); process.exit(143) })

function start(cmd, args, opts) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true, ...opts })
  const tag = `[${path.basename(opts.cwd)}]`
  child.stdout.on('data', (d) => process.env.PORTAL_SMOKE_VERBOSE && process.stdout.write(`${tag} ${d}`))
  child.stderr.on('data', (d) => process.env.PORTAL_SMOKE_VERBOSE && process.stderr.write(`${tag} ${d}`))
  started.push(child)
  return child
}

function portBusy(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' })
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('error', () => resolve(false))
  })
}

async function waitFor(url, ms, what) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    try {
      const r = await fetch(url)
      if (r.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${what} did not answer at ${url} within ${ms / 1000} s`)
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts, env: { ...process.env, ...opts.env } })
  return r.status === null ? 1 : r.status
}

async function main() {
  // 1. API
  let apiUp = false
  try { apiUp = (await fetch(`${API_URL}/health`)).ok } catch {}
  if (!apiUp) {
    if (!fs.existsSync(path.join(API_DIR, 'dist', 'src', 'main.js'))) {
      console.log('[smoke] building the API')
      if (run('pnpm', ['--filter', '@wash-and-go/api', 'build'], { cwd: ROOT }) !== 0) throw new Error('API build failed')
    }
    const port = new URL(API_URL).port || '4000'
    console.log(`[smoke] starting the API on :${port}`)
    start(process.execPath, ['dist/src/main.js'], {
      cwd: API_DIR,
      env: { ...process.env, SENTRY_DSN: '', DATABASE_URL: DB, AUTH_DEV_BYPASS: '1', NODE_ENV: 'development', PORT: port },
    })
    await waitFor(`${API_URL}/health`, 60_000, 'The API')
  } else {
    console.log(`[smoke] using the API already on ${API_URL}`)
  }

  // 2. Portal build + server
  if (await portBusy(PORT)) throw new Error(`Port ${PORT} is busy; stop that server or set PORTAL_SMOKE_PORT`)
  if (process.env.PORTAL_SMOKE_SKIP_BUILD !== '1') {
    console.log('[smoke] building the portal for e2e')
    if (run('pnpm', ['--filter', '@wash-and-go/e2e', 'build:portal-e2e'], { cwd: ROOT, env: { API_URL, NEXT_DIST_DIR: DIST_DIR } }) !== 0) {
      throw new Error('Portal build failed')
    }
  }
  const nextBin = require.resolve('next/dist/bin/next', { paths: [PORTAL_DIR] })
  console.log(`[smoke] serving the portal on :${PORT}`)
  start(process.execPath, [nextBin, 'start', '-p', String(PORT)], { cwd: PORTAL_DIR, env: { ...process.env, NEXT_DIST_DIR: DIST_DIR } })
  await waitFor(`${PORTAL}/login`, 60_000, 'The portal')

  // 3. Specs. The API throttles each client to 60 requests a minute and every
  // request here comes from localhost (the browser and the API seeding alike),
  // so the specs run in groups with the window reset in between; one long
  // run gets 429s near the end (a polled list that 429s never renders).
  const env = { PORTAL_URL: PORTAL, API_URL, E2E_ONLY: 'portal', E2E_DATABASE_URL: DB }
  const wait = Number(process.env.PORTAL_SMOKE_THROTTLE_WAIT_MS ?? 65_000)
  const pause = async () => {
    console.log(`[smoke] waiting ${Math.round(wait / 1000)} s for the API rate-limit window`)
    await new Promise((r) => setTimeout(r, wait))
  }
  const groups = [
    ['laundry-portal-shell', 'laundry-portal-help', 'laundry-portal-errors', 'laundry-portal-invite'],
    ['laundry-portal-orders', 'laundry-portal-weigh'],
    ['laundry-portal-a11y', 'laundry-portal-payouts'],
    ['laundry-portal-onboarding', 'laundry-portal-shop', 'laundry-portal-services'],
  ]
  // Any portal spec not listed above still runs, in a last group.
  const listed = new Set(groups.flat())
  const extra = fs
    .readdirSync(path.join(E2E, 'tests'))
    .filter((f) => /^laundry-portal-.*\.spec\.ts$/.test(f) && f !== 'laundry-portal-pwa.spec.ts')
    .map((f) => f.replace(/\.spec\.ts$/, ''))
    .filter((f) => !listed.has(f))
  if (extra.length) groups.push(extra)
  const results = []
  for (let i = 0; i < groups.length; i++) {
    if (i > 0) await pause()
    console.log(`[smoke] group ${i + 1}/${groups.length}: ${groups[i].join(', ')}`)
    results.push(run('npx', ['playwright', 'test', ...groups[i]], { cwd: E2E, env }))
  }
  await pause()
  const pwa = run('npx', ['playwright', 'test', '--config', 'playwright.pwa.config.ts'], {
    cwd: E2E,
    env: { ...env, PORTAL_PROD_URL: PORTAL },
  })
  const main = results.every((r) => r === 0) ? 0 : 1
  console.log(
    `[smoke] groups: ${results.map((r, i) => `${i + 1} ${r === 0 ? 'passed' : 'FAILED'}`).join('; ')}; PWA specs: ${pwa === 0 ? 'passed' : 'FAILED'}`,
  )
  return main === 0 && pwa === 0 ? 0 : 1
}

main()
  .then((code) => { stopAll(); process.exit(code) })
  .catch((e) => { console.error(`[smoke] ${e.message}`); stopAll(); process.exit(1) })
