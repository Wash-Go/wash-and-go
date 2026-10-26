#!/usr/bin/env node
// Visual QA screenshots of every laundry-portal route at 390 and 1280, light
// and dark, against a running production e2e build (PORTAL_URL, default
// http://localhost:3012) and local API (API_URL). Writes PNGs to
// .superpowers/portal-b6/screens/ (git-ignored) and prints the wizard's Tab
// order. Seeds what some screens need and removes it afterwards:
//   - a temporary owner (dev route) for /onboarding, deleted with the route;
//   - one delivered order + payout batch for /payouts/[id], deleted with psql.
// Usage: node scripts/portal-screens.cjs
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('@playwright/test')

const ROOT = path.resolve(__dirname, '..', '..')
const OUT = path.join(ROOT, '.superpowers', 'portal-b6', 'screens')
const BASE = (process.env.PORTAL_URL || 'http://localhost:3012').replace(/\/$/, '')
const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')
const DB = process.env.E2E_DATABASE_URL || 'postgresql://ban@localhost:5432/wash_and_go_design'
const OWNER_UID = `e2e-screens-${Date.now()}`

const sql = (q) => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-Atc', q]).toString().trim()

async function call(method, p, uid, body) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'x-dev-uid': uid, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function seedBatch() {
  const shops = await call('GET', '/shops', 'dev-customer')
  const shop = shops.find((s) => /tetuan/i.test(s.name)) || shops[0]
  const o = await call('POST', '/orders', 'dev-customer', {
    shopServiceId: shop.services[0].id, pickupAddress: 'Screens pickup, Tetuan', pickupLat: 6.9111, pickupLng: 122.0794, loadCategory: 'S',
  })
  const riders = await call('GET', '/riders', 'dev-admin')
  await call('POST', `/orders/${o.id}/assign-rider`, 'dev-admin', { riderId: riders[0].id })
  const step = (status) => call('POST', `/orders/${o.id}/status`, 'dev-admin', { status })
  await step('PICKED_UP'); await step('AT_SHOP')
  await call('POST', `/orders/${o.id}/weigh`, 'dev-shop-owner', { weightKg: 4.2 })
  await step('PROCESSING'); await step('READY_FOR_RETURN'); await step('OUT_FOR_RETURN')
  const from = new Date(Date.now() - 5000)
  await step('DELIVERED')
  const [batch] = await call('POST', '/admin/remittance/close', 'dev-admin', {
    periodStart: from.toISOString(), periodEnd: new Date(Date.now() + 5000).toISOString(), shopId: shop.id,
  })
  return { orderId: o.id, batchId: batch.id }
}

function cleanupBatch(s) {
  if (!s) return
  sql(`BEGIN; DELETE FROM "RemittanceLine" WHERE "orderId"='${s.orderId}'; DELETE FROM "RemittanceBatch" WHERE id='${s.batchId}'; ` +
    `DELETE FROM "OrderEvent" WHERE "orderId"='${s.orderId}'; DELETE FROM "Notification" WHERE "orderId"='${s.orderId}'; ` +
    `DELETE FROM "Order" WHERE id='${s.orderId}'; COMMIT;`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  await call('POST', '/dev/users', 'dev-admin', { uid: OWNER_UID, displayName: 'Rosa Screens', roles: ['CUSTOMER'] })
  await call('POST', '/shop/onboarding/start', OWNER_UID)
  let seeded = null
  const browser = await chromium.launch()
  try {
    seeded = await seedBatch()
    const active = await call('GET', '/orders?active=true', 'dev-shop-owner')
    const atShop = active.find((o) => o.status === 'AT_SHOP') || active[0]
    const routes = [
      ['login', '/login'], ['signup', '/signup'], ['orders', '/'], ['order-detail', `/orders/${atShop.id}`],
      ['payouts', '/payouts'], ['payout-batch', `/payouts/${seeded.batchId}`], ['services', '/services'],
      ['shop', '/shop'], ['staff', '/staff'], ['help', '/help'], ['not-found', '/no-such-page'], ['offline', '/~offline'],
      ['onboarding', '/onboarding', OWNER_UID], ['not-a-shop', '/', 'dev-customer'],
    ]
    for (const scheme of ['light', 'dark']) {
      for (const width of [390, 1280]) {
        const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, colorScheme: scheme, serviceWorkers: 'block' })
        // Light is the default regardless of the OS (B8); dark is the stored choice.
        if (scheme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('wg-portal-theme', 'dark') } catch {} })
        for (const [name, url, uid] of routes) {
          const page = await ctx.newPage()
          if (uid) await page.route(`${API}/**`, (r) => r.continue({ headers: { ...r.request().headers(), 'x-dev-uid': uid } }))
          await page.goto(BASE + url)
          await page.waitForTimeout(1800)
          await page.screenshot({ path: path.join(OUT, `${scheme}-${width}-${name}.png`), fullPage: true })
          if (name === 'orders') {
            await page.locator('article.oc button').first().click()
            await page.getByLabel('Weight on the scale').fill('7.4')
            await page.waitForTimeout(1500)
            await page.screenshot({ path: path.join(OUT, `${scheme}-${width}-weigh-sheet.png`) })
          }
          if (name === 'onboarding' && scheme === 'light' && width === 390) {
            const order = []
            for (let i = 0; i < 14; i++) {
              await page.keyboard.press('Tab')
              order.push(await page.evaluate(() => {
                const a = document.activeElement
                const lab = a && a.labels && a.labels[0] ? a.labels[0].textContent : ''
                return `${a.tagName.toLowerCase()}:${(a.getAttribute('aria-label') || lab || a.textContent || '').trim().slice(0, 40)}`
              }))
            }
            console.log('wizard tab order:', order.join(' → '))
          }
          await page.close()
        }
        await ctx.close()
      }
    }
  } finally {
    await browser.close()
    cleanupBatch(seeded)
    await call('DELETE', `/dev/users/${OWNER_UID}`, 'dev-admin').catch((e) => console.error(e.message))
  }
  console.log(`screenshots in ${path.relative(ROOT, OUT)}: ${fs.readdirSync(OUT).length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
