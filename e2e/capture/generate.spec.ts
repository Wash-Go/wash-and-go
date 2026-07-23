import { test, type Browser, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  seedAtShopOrder,
  seedBookedOrder,
  seedAssignedToRider,
  seedRiderCollectedCash,
} from '../lib/seed';
import { customerLogin } from '../lib/customer';

const ADMIN = 'http://localhost:3001';
const PORTAL = 'http://localhost:3002';
const CUSTOMER = 'http://localhost:3000';
const RIDER = 'http://localhost:3003';
const OUT = join(__dirname, 'out');
const PDF_PATH = '/Users/ban/dev/wash-and-go/Wash-and-Go-Features.pdf';

function tomtomKey(): string {
  const env = readFileSync('/Users/ban/dev/wash-and-go/apps/api/.env', 'utf8');
  const m = env.match(/^TOMTOM_API_KEY="?([^"\n]+)"?/m);
  if (!m) throw new Error('No TOMTOM_API_KEY');
  return m[1];
}

const shots: Record<string, string> = {}; // name -> data URI

async function shoot(name: string, fn: () => Promise<Buffer>): Promise<void> {
  try {
    const buf = await fn();
    shots[name] = `data:image/png;base64,${buf.toString('base64')}`;
    writeFileSync(join(OUT, `${name}.png`), buf);
    console.log(`  shot: ${name}`);
  } catch (e) {
    console.log(`  shot FAILED: ${name} — ${String(e).slice(0, 120)}`);
  }
}

async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  return ctx.newPage();
}

// A slippy TomTom map of Zamboanga with the two shops + the coverage zone.
function mapHtml(key: string): string {
  return `<!doctype html><html><head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>html,body,#map{margin:0;height:820px;width:1180px}</style></head>
  <body><div id="map"></div><script>
    const map = L.map('map', {zoomControl:true, attributionControl:true}).setView([6.925,122.083], 13);
    L.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${key}&tileSize=256', {
      maxZoom: 19, attribution: '© TomTom'
    }).addTo(map);
    L.polygon([[6.86,122.02],[6.86,122.14],[6.98,122.14],[6.98,122.02]],
      {color:'#208aef', weight:2, fillOpacity:0.08}).addTo(map).bindTooltip('Coverage zone');
    L.marker([6.9111,122.0794]).addTo(map).bindTooltip('Tetuan Laundry Hub', {permanent:true});
    L.marker([6.9245,122.0865]).addTo(map).bindTooltip('Guiwan Wash Center', {permanent:true});
    let loaded=0; map.eachLayer(l=>{if(l.on)l.on('load',()=>loaded++)});
    window.__ready = false; map.whenReady(()=>{ setTimeout(()=>window.__ready=true, 3500); });
  </script></body></html>`;
}

test('generate the feature PDF', async ({ browser }) => {
  test.setTimeout(300_000);

  // ---- demo data so the app screenshots aren't empty ----
  try {
    await seedRiderCollectedCash();
    await seedAtShopOrder();
    await seedAssignedToRider('Rider One');
    await seedBookedOrder();
  } catch (e) {
    console.log('seed warn:', String(e).slice(0, 160));
  }

  // ---- TomTom map ----
  {
    const page = await newPage(browser);
    await page.setContent(mapHtml(tomtomKey()));
    await page.waitForFunction(() => (window as unknown as { __ready: boolean }).__ready, {
      timeout: 30_000,
    });
    await page.waitForTimeout(1500);
    await shoot('map', () => page.locator('#map').screenshot());
    await page.close();
  }

  // ---- admin ----
  {
    const page = await newPage(browser);
    await page.goto(`${ADMIN}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot('admin-dispatch', () => page.screenshot());
    await page.goto(`${ADMIN}/zones`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot('admin-zones', () => page.screenshot());
    await page.goto(`${ADMIN}/rider-cash`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot('admin-rider-cash', () => page.screenshot());
    await page.goto(`${ADMIN}/config`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot('admin-config', () => page.screenshot());
    await page.goto(`${ADMIN}/remittance`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot('admin-payouts', () => page.screenshot());
    await page.close();
  }

  // ---- portal ----
  {
    const page = await newPage(browser);
    await page.goto(`${PORTAL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    await shoot('portal', () => page.screenshot());
    await page.close();
  }

  // ---- rider ----
  {
    const page = await newPage(browser);
    await page.goto(RIDER, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await shoot('rider', () => page.screenshot());
    await page.close();
  }

  // ---- customer (Firebase login → dashboard → book → checkout) ----
  {
    const page = await newPage(browser);
    try {
      await page.goto(CUSTOMER, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await shoot('customer-login', () => page.screenshot());
      await customerLogin(page);
      await page.waitForTimeout(1000);
      await shoot('customer-home', () => page.screenshot());
      await page.getByRole('button', { name: /Book a wash/ }).click();
      await page.getByTestId('bucket-M').click();
      await page.getByPlaceholder('Pickup address (street, barangay)').fill('Tetuan, Zamboanga City');
      await page.getByText('Find this address').click();
      await page.waitForTimeout(1500);
      await shoot('customer-book', () => page.screenshot());
      const cont = page.getByText('Continue', { exact: true });
      await cont.click();
      await page.getByText('Confirm booking').waitFor({ timeout: 20_000 });
      await page.waitForTimeout(800);
      await shoot('customer-checkout', () => page.screenshot());
    } catch (e) {
      console.log('customer warn:', String(e).slice(0, 160));
    }
    await page.close();
  }

  // ---- assemble PDF ----
  const html = buildDoc(shots);
  writeFileSync(join(OUT, 'features.html'), html);
  const page = await newPage(browser);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  });
  await page.close();
  console.log(`\nPDF written: ${PDF_PATH}`);
});

function img(uri?: string): string {
  return uri ? `<img src="${uri}"/>` : `<div class="ph">screenshot unavailable</div>`;
}

function buildDoc(s: Record<string, string>): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  :root{--navy:#0f1b2d;--brand:#208aef;--terra:#d07a29;--ink:#0f1729;--muted:#64748b;--line:#e6eaf1}
  *{box-sizing:border-box}
  body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--ink);margin:0}
  img{max-width:100%;border:1px solid var(--line);border-radius:8px;display:block}
  .ph{border:1px dashed var(--line);border-radius:8px;padding:40px;text-align:center;color:var(--muted);font-size:13px}
  h1{font-size:30px;margin:0 0 4px;letter-spacing:-.02em}
  h2{font-size:19px;margin:0 0 2px;letter-spacing:-.01em}
  h3{font-size:14px;margin:0 0 8px;color:var(--brand);text-transform:uppercase;letter-spacing:.1em}
  p{line-height:1.55;color:#31405a;font-size:13px}
  .cover{background:var(--navy);color:#fff;padding:56px 44px;border-radius:14px;margin-bottom:26px}
  .cover .eyebrow{color:#e7b98a;font-size:12px;letter-spacing:.24em;text-transform:uppercase}
  .cover h1{color:#fff;font-size:40px;margin-top:10px}
  .cover .sub{color:#9fb0c6;font-size:15px;margin-top:6px}
  .section{page-break-inside:avoid;margin:0 0 30px}
  .lead{color:var(--muted);font-size:13px;margin:2px 0 14px}
  ul{margin:6px 0 0;padding-left:18px}
  li{font-size:12.5px;line-height:1.6;margin:2px 0}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .cap{font-size:11px;color:var(--muted);margin-top:5px}
  .pill{display:inline-block;background:#eef4fd;color:var(--brand);font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;margin-right:6px}
  .rule{height:1px;background:var(--line);margin:22px 0}
  .pb{page-break-before:always}
  .card{border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:10px}
  .k{font-weight:700}
  </style></head><body>

  <div class="cover">
    <div class="eyebrow">Product overview · Zamboanga City pilot</div>
    <h1>Wash &amp; Go</h1>
    <div class="sub">A scheduling-first laundry marketplace — express pickup, delivery, and settlement across four apps and one backend.</div>
  </div>

  <div class="section">
    <h3>Coverage &amp; routing</h3>
    <h2>Live map — Zamboanga City</h2>
    <p class="lead">Real TomTom map. Two pilot partner shops pinned; the blue outline is the active coverage zone. Bookings geocode against TomTom Search and price delivery on TomTom driving distance.</p>
    ${img(s.map)}
    <div class="cap">TomTom Maps + Search + Routing APIs · shops: Tetuan Laundry Hub, Guiwan Wash Center · coverage zone (admin-editable).</div>
  </div>

  <div class="section pb">
    <h3>Customer app</h3>
    <h2>Book a wash in under a minute</h2>
    <p class="lead">React Native / Expo. Firebase email/password auth. The customer never picks a shop — the system resolves the nearest one and prices it upfront.</p>
    <div class="grid2">
      <div>${img(s['customer-home'])}<div class="cap">Dashboard — one-tap "Book a wash", live active-order card.</div></div>
      <div>${img(s['customer-book'])}<div class="cap">Load size + pickup — GPS, saved addresses, or typed address geocoded via TomTom.</div></div>
    </div>
    <div style="margin-top:12px">${img(s['customer-checkout'])}<div class="cap">Checkout — auto-resolved nearest shop (Closest badge), distance-based price breakdown, "Change laundry" option.</div></div>
    <ul>
      <li><span class="k">Auto shop-match</span> — nearest active shop by distance, with a manual override.</li>
      <li><span class="k">Address book</span> — saved pickups, one default, prefilled at booking.</li>
      <li><span class="k">Geocoding</span> — type an address, get a pinned pickup (TomTom Search).</li>
      <li><span class="k">Transparent pricing</span> — wash + distance delivery + service fee, shown before confirm.</li>
      <li><span class="k">Order tracking</span> — live status + full price breakdown per order.</li>
    </ul>
  </div>

  <div class="section pb">
    <h3>Rider app</h3>
    <h2>Assigned jobs, one clear next step</h2>
    <div class="grid2">
      <div>${img(s.rider)}<div class="cap">Job board — jobs grouped by action / waiting / done, with the next step surfaced.</div></div>
      <div>
        <div class="card">
          <p><span class="pill">Two-leg</span> Pickup → shop, then shop → customer, as separate legs.</p>
          <ul>
            <li>Tap-through status machine (picked up → at shop → out for return → delivered).</li>
            <li>Slide-to-confirm on the irreversible delivery step.</li>
            <li>Cash-on-delivery collection recorded per order.</li>
            <li>External navigation deep-links to pickup / shop.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="section pb">
    <h3>Shop portal</h3>
    <h2>Weigh, price, process</h2>
    ${img(s.portal)}
    <div class="cap">Laundry portal — the shop's live order queue.</div>
    <ul>
      <li><span class="k">Weigh-in</span> — enter the real weight, preview the recomputed price, confirm.</li>
      <li><span class="k">Status drive</span> — at-shop → washing → ready-for-return.</li>
      <li><span class="k">Scoped queue</span> — a shop sees only its own orders.</li>
    </ul>
  </div>

  <div class="section pb">
    <h3>Admin console</h3>
    <h2>Oversight, exceptions, and business rules</h2>
    <div class="grid2">
      <div>${img(s['admin-dispatch'])}<div class="cap">Dispatch board — assign a rider when auto-match falls through.</div></div>
      <div>${img(s['admin-zones'])}<div class="cap">Zones — draw / toggle coverage areas (shape preview).</div></div>
      <div>${img(s['admin-rider-cash'])}<div class="cap">Rider cash — COD collected vs deposited, record deposits.</div></div>
      <div>${img(s['admin-config'])}<div class="cap">Business rules — fees, delivery params, thresholds, live (no redeploy).</div></div>
    </div>
    <div style="margin-top:12px">${img(s['admin-payouts'])}<div class="cap">Shop payouts — close a period into per-shop batches, mark paid with a transfer reference.</div></div>
  </div>

  <div class="section pb">
    <h3>Platform &amp; backend</h3>
    <h2>The engine underneath</h2>
    <p class="lead">NestJS + Fastify + Prisma + Postgres. Modular monolith, controller → service → repository, explicit transactions.</p>
    <div class="grid2">
      <div class="card">
        <h2 style="font-size:15px">Money path</h2>
        <ul>
          <li>Pricing engine — Decimal math, commission by subtraction.</li>
          <li>Distance delivery fee (TomTom routing; haversine fallback).</li>
          <li>Express capacity — advisory lock + Manila-day window.</li>
          <li>Remittance batching — per-shop payout, mark-paid.</li>
          <li>Rider cash reconciliation — platform-intermediated COD.</li>
        </ul>
      </div>
      <div class="card">
        <h2 style="font-size:15px">Platform</h2>
        <ul>
          <li>Firebase auth, role matrix, secure-by-default guards.</li>
          <li>Admin-editable business rules (audited, no redeploy).</li>
          <li>Zones — DB coverage polygons + point-in-polygon resolve.</li>
          <li>MapsProvider boundary — TomTom now, swappable.</li>
          <li>Hardened: env schema, exception filter, throttler, helmet, CORS.</li>
        </ul>
      </div>
    </div>
    <div class="rule"></div>
    <p style="font-size:12px;color:var(--muted)">Quality: 166 backend unit + integration tests, 10 automated browser smokes across all four apps, CI on GitHub Actions. Browser smoke has caught and fixed 4 real production bugs.</p>
  </div>

  </body></html>`;
}
