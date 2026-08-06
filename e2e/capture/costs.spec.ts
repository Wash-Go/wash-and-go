import { test } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(__dirname, 'out');
const PDF_PATH = '/Users/ban/dev/wash-and-go/Wash-and-Go-Cost-Matrix.pdf';

test('generate the cost matrix PDF', async ({ browser }) => {
  const html = doc();
  writeFileSync(join(OUT, 'costs.html'), html);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '13mm', bottom: '13mm', left: '11mm', right: '11mm' },
  });
  await ctx.close();
  console.log(`PDF written: ${PDF_PATH}`);
});

type Row = {
  service: string;
  purpose: string;
  free: string;
  now: string;
  launch: string;
  note?: string;
};

function group(title: string, rows: Row[]): string {
  return `
  <tr class="grp"><td colspan="5">${title}</td></tr>
  ${rows
    .map(
      (r) => `<tr>
      <td><span class="svc">${r.service}</span><span class="pp">${r.purpose}</span></td>
      <td class="free">${r.free}</td>
      <td class="n">${r.now}</td>
      <td class="n lch">${r.launch}</td>
      <td class="note">${r.note ?? ''}</td>
    </tr>`,
    )
    .join('')}`;
}

function doc(): string {
  const hosting = group('Hosting &amp; infrastructure', [
    { service: 'Railway', purpose: 'API (NestJS) + Postgres', free: '$5 trial credit, no card', now: '$0', launch: '~$20/mo', note: 'usage-based; small API + DB' },
    { service: 'Vercel', purpose: 'Web: admin, portal, landing', free: 'Hobby free (non-commercial)', now: '$0', launch: '$20/mo', note: 'Pro required for commercial · 1 seat, $20 usage incl.' },
    { service: 'Redis', purpose: 'Jobs, realtime, throttle', free: 'Upstash free / Railway usage', now: '$0', launch: '$0', note: 'Not needed until Phase D (realtime/push) — fast-follow' },
  ]);
  const maps = group('Maps', [
    { service: 'TomTom', purpose: 'Geocode · routing · tiles', free: '50k tiles + 2.5k non-tile / DAY', now: '$0', launch: '$0', note: 'Pilot fits free tier. Overage/1k: geocode $0.75, routing $0.75+' },
  ]);
  const auth = group('Auth &amp; notifications', [
    { service: 'Firebase Auth', purpose: 'Email + phone OTP', free: 'Email free; phone: small daily free', now: '$0', launch: '~$0–10/mo', note: 'Phone OTP = per-SMS (~₱0.5–3 ea); pennies at pilot volume' },
    { service: 'Firebase FCM', purpose: 'Push notifications', free: 'Free (unlimited)', now: '$0', launch: '$0', note: 'Lands Phase D' },
  ]);
  const pay = group('Payments (online = fast-follow)', [
    { service: 'PayMongo', purpose: 'GCash / Maya / card / QR Ph', free: 'No monthly fee', now: '$0', launch: '% of revenue', note: 'GCash 2.23% · QR Ph ~1.34% · card 3.125% + ₱13.39 · only when online launches' },
  ]);
  const mobile = group('Mobile distribution', [
    { service: 'Apple Developer', purpose: 'iOS App Store account', free: '—', now: '$0', launch: '$99 / yr', note: 'Required to ship on iOS' },
    { service: 'Google Play', purpose: 'Android account', free: '—', now: '$0', launch: '$25 once', note: 'One-time, lifetime' },
    { service: 'Expo EAS', purpose: 'Mobile build service', free: '15 iOS + 15 Android builds/mo', now: '$0', launch: '$0', note: 'Free tier covers pilot; $19/mo (Starter) if frequent builds' },
  ]);
  const opt = group('Optional', [
    { service: 'Sentry', purpose: 'Error tracking', free: '5k errors/mo free', now: '$0', launch: '$0', note: 'Free tier fine at pilot' },
    { service: 'Domain', purpose: 'washandgo.app etc.', free: '—', now: '$0', launch: '~$12 / yr', note: 'Optional' },
  ]);

  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--navy:#004375;--brand:#208aef;--terra:#d07a29;--green:#2f7d5b;--ink:#1a2430;--muted:#5a6775;--line:#e6eaf1}
  *{box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',-apple-system,sans-serif;color:var(--ink);margin:0}
  h1{font-size:30px;margin:0;letter-spacing:-.02em}
  h3{font-size:13px;margin:0 0 8px;color:var(--brand);text-transform:uppercase;letter-spacing:.11em;font-weight:800}
  p{line-height:1.55;color:#31405a;font-size:13px;margin:6px 0}
  .cover{background:var(--navy);color:#fff;padding:48px 44px;border-radius:14px;margin-bottom:22px}
  .cover .eyebrow{color:#e7b98a;font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700}
  .cover h1{color:#fff;font-size:36px;margin-top:10px}
  .cover .sub{color:#9fb0c6;font-size:14px;margin-top:8px;max-width:580px;line-height:1.5}
  .summ{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
  .scard{border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}
  .scard .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800}
  .scard .big{font-size:24px;font-weight:800;margin-top:4px;letter-spacing:-.02em}
  .scard .sub{font-size:11.5px;color:var(--muted);margin-top:3px}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th{text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:800;border-bottom:2px solid var(--ink)}
  td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
  td.lch{color:var(--navy)}
  .svc{font-weight:800;display:block;font-size:12.5px}
  .pp{color:var(--muted);font-size:11px}
  td.free{font-size:11px;color:#31405a}
  td.note{font-size:10.5px;color:var(--muted);line-height:1.4}
  tr.grp td{background:#f1f5fb;font-weight:800;color:var(--navy);font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:7px 10px;border-bottom:1px solid var(--line)}
  .foot{font-size:10px;color:var(--muted);margin-top:14px;line-height:1.5}
  .k{font-weight:700;color:var(--ink)}
  </style></head><body>

  <div class="cover">
    <div class="eyebrow">Platform costs · Zamboanga City pilot</div>
    <h1>Cost &amp; platform matrix</h1>
    <div class="sub">Every third-party service the stack uses, its free tier, what it costs today (all local + free tiers) and at the express launch. Deploy plan: Railway for the API, Vercel for the web apps.</div>
  </div>

  <div class="summ">
    <div class="scard"><div class="lbl">Today (dev)</div><div class="big">$0<span style="font-size:14px">/mo</span></div><div class="sub">Local Docker + every service on its free tier</div></div>
    <div class="scard"><div class="lbl">At launch — recurring</div><div class="big" style="color:var(--navy)">~$45<span style="font-size:14px">/mo</span></div><div class="sub">Railway ~$20 + Vercel $20 + Firebase SMS ~$5</div></div>
    <div class="scard"><div class="lbl">One-time / yearly</div><div class="big" style="color:var(--terra)">$124</div><div class="sub">Apple $99/yr + Google $25 once (+ domain ~$12/yr)</div></div>
  </div>

  <table>
    <tr><th>Service</th><th>Free tier</th><th style="text-align:right">Now</th><th style="text-align:right">At launch</th><th>Notes</th></tr>
    ${hosting}${maps}${auth}${pay}${mobile}${opt}
  </table>

  <div class="foot">
    <p style="margin:0 0 4px"><span class="k">Reading it:</span> the express (cash-only) launch runs on ~$45/mo recurring plus the one-time store accounts. Everything else stays $0 until it's needed.</p>
    <p style="margin:0 0 4px"><span class="k">What scales with volume:</span> TomTom (only past 2.5k geocode/routing calls a day), Firebase phone-OTP SMS (per signup), Railway/Vercel usage (past their included credits), and Expo EAS if you build often.</p>
    <p style="margin:0 0 4px"><span class="k">Fast-follow costs (not at launch):</span> Redis (Phase D realtime/push), PayMongo (% of revenue when online payments go live), possibly EAS Starter ($19/mo).</p>
    <p style="margin:0"><span class="k">PayMongo is revenue-linked, not fixed:</span> GCash 2.23%, QR Ph ~1.34%, cards 3.125% + ₱13.39 — a cut of each online order, nothing when it's cash.</p>
    <p style="margin:8px 0 0;color:#9aa4b0">Prices as of July 2026 — verify at deploy; TomTom + some tiers were being revised. Currency: hosting/stores in USD, PayMongo + SMS in PHP.</p>
  </div>

  </body></html>`;
}
