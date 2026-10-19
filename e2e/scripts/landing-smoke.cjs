#!/usr/bin/env node
// Browser smoke for the investor landing page (apps/landing-page).
//
// It does not build or start anything. Build the page and serve it first:
//   pnpm --filter wash-and-go-landing-page build
//   pnpm --filter wash-and-go-landing-page exec vite preview --port 4173 --strictPort
// then run: node e2e/scripts/landing-smoke.cjs [baseUrl]   (default http://localhost:4173)
//
// Checks, at 390x844 @2x and 1440x900: every <img> decodes after a full scroll
// (the gallery is lazy), the full-page screenshot, no console errors or failed
// requests, each nav anchor lands on the section with that id, and at 390 the
// hamburger opens and closes. The old-route redirects live in vercel.json, which
// vite preview does not run, so they are asserted from the file. Also prints
// CDP performance metrics and the bytes transferred for a cold load of /.
// Screenshots go to .superpowers/landing-smoke/ (git-ignored).
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const BASE = (process.argv[2] || process.env.LANDING_URL || 'http://localhost:4173').replace(/\/$/, '')
const ROOT = path.resolve(__dirname, '..', '..')
const OUT = path.join(ROOT, '.superpowers', 'landing-smoke')
const VERCEL_JSON = path.join(ROOT, 'apps', 'landing-page', 'vercel.json')

const failures = []
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`)
  if (!ok) failures.push(msg)
}

function checkRedirects() {
  const cfg = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'))
  const want = { '/pricing': '/#model', '/services': '/#how-it-works', '/book-order': '/#how-it-works', '/my-orders': '/#how-it-works' }
  for (const [source, destination] of Object.entries(want)) {
    const r = (cfg.redirects || []).find((x) => x.source === source)
    check(r && r.destination === destination, `vercel.json redirects ${source} -> ${destination}`)
  }
  check(cfg.outputDirectory === 'dist/client', 'vercel.json serves dist/client')
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.75)
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((r) => setTimeout(r, 300))
  })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r }),
      ),
    ),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function checkAnchors(page, label, mobile) {
  const links = await page.$$eval('header nav a[href*="#"]', (as) =>
    as.filter((a) => a.offsetParent !== null || a.closest('#mobile-menu'))
      .map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim(), mobile: !!a.closest('#mobile-menu') })),
  )
  const targets = links.filter((l) => l.mobile === mobile)
  check(targets.length > 0, `${label}: nav has anchor links (${targets.map((t) => t.href).join(' ')})`)
  for (const link of targets) {
    const id = link.href.split('#')[1]
    await page.evaluate(() => window.scrollTo(0, 0))
    if (mobile) await page.click('button[aria-controls="mobile-menu"]')
    await page.click(`${mobile ? '#mobile-menu' : 'header nav > div > div'} a[href="${link.href}"]`)
    await page.waitForTimeout(400)
    const r = await page.evaluate((id) => {
      const el = document.getElementById(id)
      if (!el) return { exists: false }
      const top = el.getBoundingClientRect().top
      const header = document.querySelector('header').getBoundingClientRect().height
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      return { exists: true, tag: el.tagName, top: Math.round(top), header: Math.round(header), atBottom, hash: location.hash, scrollY: window.scrollY }
    }, id)
    const lands = r.exists && r.hash === `#${id}` && r.top >= 0 && (r.top <= r.header + 40 || r.atBottom) && r.scrollY > 0
    check(lands, `${label}: "${link.text}" -> #${id} lands on <${r.tag || '?'}> (top ${r.top}px, header ${r.header}px${r.atBottom ? ', page bottom' : ''})`)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function checkHamburger(page) {
  const btn = page.locator('button[aria-controls="mobile-menu"]')
  const menu = page.locator('#mobile-menu')
  check(await btn.isVisible(), '390: hamburger visible')
  check(!(await menu.isVisible()), '390: menu hidden at load')
  await btn.click()
  check((await menu.isVisible()) && (await btn.getAttribute('aria-expanded')) === 'true', '390: hamburger opens the menu')
  await page.screenshot({ path: path.join(OUT, 'menu-open-390.png') })
  await btn.click()
  check(!(await menu.isVisible()) && (await btn.getAttribute('aria-expanded')) === 'false', '390: hamburger closes the menu')
  await btn.click()
  await page.keyboard.press('Escape')
  check(!(await menu.isVisible()), '390: Escape closes the menu')
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, isMobile: vp.width < 768, hasTouch: vp.width < 768 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => { if (!r.url().startsWith('mailto:')) errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`) })

  const label = String(vp.width)
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  const before = await page.$$eval('img', (imgs) => imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).length)
  await scrollThrough(page)
  const imgs = await page.$$eval('img', (imgs) => imgs.map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth, alt: i.getAttribute('alt') })))
  const broken = imgs.filter((i) => !(i.w > 0))
  check(broken.length === 0, `${label}: all ${imgs.length} <img> decoded after scroll (${before} not loaded before scroll)${broken.length ? ' broken: ' + broken.map((b) => b.src).join(', ') : ''}`)
  check(imgs.every((i) => i.alt !== null), `${label}: every <img> has an alt attribute`)
  const h1 = await page.$$eval('h1', (hs) => hs.map((h) => h.textContent.trim()))
  check(h1.length === 1, `${label}: one <h1> (${JSON.stringify(h1)})`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(overflow <= 0, `${label}: no horizontal overflow (${overflow}px)`)

  const shot = path.join(OUT, `home-${vp.width}x${vp.height}${vp.scale > 1 ? `@${vp.scale}x` : ''}.png`)
  await page.screenshot({ path: shot, fullPage: true })
  console.log(`     screenshot ${path.relative(ROOT, shot)}`)

  if (vp.width < 768) await checkHamburger(page)
  await checkAnchors(page, label, vp.width < 768)
  check(errors.length === 0, `${label}: no console errors / failed requests${errors.length ? '\n       ' + errors.join('\n       ') : ''}`)
  await context.close()
  return { width: vp.width, images: imgs.length, notLoadedBeforeScroll: before }
}

async function measure(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Performance.enable')
  const bytes = new Map()
  const types = new Map()
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type))
  cdp.on('Network.loadingFinished', (e) => bytes.set(e.requestId, e.encodedDataLength))
  await page.addInitScript(() => {
    window.__lcp = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    window.__cls = 0
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const initial = [...bytes.values()].reduce((a, b) => a + b, 0)
  await scrollThrough(page)
  const total = [...bytes.values()].reduce((a, b) => a + b, 0)
  const byType = {}
  for (const [id, n] of bytes) { const t = types.get(id) || 'Other'; byType[t] = (byType[t] || 0) + n }
  const { metrics } = await cdp.send('Performance.getMetrics')
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]))
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]
    return { ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, fcp: fcp && fcp.startTime, lcp: window.__lcp, cls: window.__cls }
  })
  await context.close()
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`
  console.log(`METRIC transferred initial load ${kb(initial)}, after full scroll ${kb(total)}`)
  console.log(`METRIC by type ${Object.entries(byType).map(([t, n]) => `${t} ${kb(n)}`).join(', ')}`)
  console.log(`METRIC timing ms ttfb ${timing.ttfb.toFixed(0)} fcp ${timing.fcp?.toFixed(0)} lcp ${timing.lcp.toFixed(0)} dcl ${timing.domContentLoaded.toFixed(0)} load ${timing.load.toFixed(0)} cls ${timing.cls.toFixed(4)}`)
  console.log(`METRIC cdp Nodes ${m.Nodes} JSHeapUsedSize ${kb(m.JSHeapUsedSize)} ScriptDuration ${(m.ScriptDuration * 1000).toFixed(0)}ms LayoutDuration ${(m.LayoutDuration * 1000).toFixed(0)}ms RecalcStyleDuration ${(m.RecalcStyleDuration * 1000).toFixed(0)}ms TaskDuration ${(m.TaskDuration * 1000).toFixed(0)}ms`)
  check(total <= 1024 * 1024, `home page transferred ${kb(total)} after full scroll (budget 1 MB)`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  checkRedirects()
  const browser = await chromium.launch()
  try {
    await runViewport(browser, { width: 390, height: 844, scale: 2 })
    await runViewport(browser, { width: 1440, height: 900, scale: 1 })
    await measure(browser)
  } finally {
    await browser.close()
  }
  console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nlanding smoke: all checks passed')
  process.exit(failures.length ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
