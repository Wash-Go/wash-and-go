import { test } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(__dirname, 'out');
const PDF_PATH = '/Users/ban/dev/wash-and-go/Wash-and-Go-Money-Flow.pdf';

test('generate the money-flow PDF', async ({ browser }) => {
  const html = doc();
  writeFileSync(join(OUT, 'money.html'), html);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  });
  await ctx.close();
  console.log(`PDF written: ${PDF_PATH}`);
});

// Flow diagram — customer → rider (COD) → platform (holds) → shop payout +
// platform revenue, with rider settlement + withdrawal.
function diagram(): string {
  const navy = '#004375';
  const terra = '#d07a29';
  const green = '#2f7d5b';
  const ink = '#1a2430';
  const muted = '#5a6775';
  const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  const t = (x: number, y: number, s: string, opts = '') =>
    `<text x="${x}" y="${y}" ${opts}>${s}</text>`;
  return `<svg viewBox="0 0 820 560" width="100%" font-family="'Plus Jakarta Sans',sans-serif">
    <defs>
      <marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 Z" fill="${muted}"/>
      </marker>
      <marker id="arT" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 Z" fill="${terra}"/>
      </marker>
      <marker id="arG" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 Z" fill="${green}"/>
      </marker>
    </defs>

    <!-- Customer -->
    ${box(40, 40, 210, 78, '#eef4fb', navy)}
    ${t(60, 72, 'Customer', `fill="${navy}" font-size="16" font-weight="700"`)}
    ${t(60, 96, 'Pays the full order total', `fill="${muted}" font-size="12"`)}

    <!-- Rider -->
    ${box(570, 40, 210, 78, '#f7ecdf', terra)}
    ${t(590, 72, 'Rider', `fill="${terra}" font-size="16" font-weight="700"`)}
    ${t(590, 96, "Platform's agent — collects COD", `fill="${muted}" font-size="12"`)}

    <!-- Platform -->
    ${box(270, 230, 280, 96, navy, navy)}
    ${t(410, 268, 'Platform', `fill="#fff" font-size="18" font-weight="800" text-anchor="middle"`)}
    ${t(410, 293, 'Holds all funds until settlement', `fill="#a9c3d8" font-size="12" text-anchor="middle"`)}

    <!-- Shop -->
    ${box(40, 430, 240, 90, '#eaf3ee', green)}
    ${t(60, 462, 'Laundry shop', `fill="${green}" font-size="16" font-weight="700"`)}
    ${t(60, 486, 'Wash earnings − commission', `fill="${muted}" font-size="12"`)}
    ${t(60, 505, 'Paid weekly (batched)', `fill="${muted}" font-size="12"`)}

    <!-- Platform revenue -->
    ${box(540, 430, 240, 90, '#fff', ink)}
    ${t(560, 462, 'Platform revenue', `fill="${ink}" font-size="16" font-weight="700"`)}
    ${t(560, 486, 'Commission + delivery + service', `fill="${muted}" font-size="12"`)}
    ${t(560, 505, '(delivery funds rider pay)', `fill="${muted}" font-size="12"`)}

    <!-- Customer -> Rider -->
    <path d="M250,79 L568,79" stroke="${terra}" stroke-width="2" fill="none" marker-end="url(#arT)"/>
    ${t(410, 68, '1  pays ₱ total (COD at delivery)', `fill="${terra}" font-size="12" font-weight="700" text-anchor="middle"`)}

    <!-- Rider -> Platform (deposit) -->
    <path d="M640,120 C640,180 540,190 505,228" stroke="${muted}" stroke-width="2" fill="none" marker-end="url(#ar)"/>
    ${t(630, 180, '2  deposits', `fill="${muted}" font-size="12" font-weight="700"`)}
    ${t(618, 196, 'collected cash', `fill="${muted}" font-size="12"`)}

    <!-- Customer -> Platform (online, dashed) -->
    <path d="M150,120 C150,175 250,188 288,228" stroke="${navy}" stroke-width="1.6" fill="none" stroke-dasharray="5 4" marker-end="url(#ar)"/>
    ${t(70, 180, 'online (later):', `fill="${navy}" font-size="11" font-weight="700"`)}
    ${t(70, 196, 'straight to platform', `fill="${navy}" font-size="11"`)}

    <!-- Platform -> Shop -->
    <path d="M320,328 C280,375 220,388 175,426" stroke="${green}" stroke-width="2" fill="none" marker-end="url(#arG)"/>
    ${t(150, 388, '3  weekly payout', `fill="${green}" font-size="12" font-weight="700"`)}

    <!-- Platform -> Revenue -->
    <path d="M500,328 C560,375 610,388 650,426" stroke="${muted}" stroke-width="2" fill="none" marker-end="url(#ar)"/>
    ${t(560, 388, '4  platform keeps', `fill="${ink}" font-size="12" font-weight="700"`)}
  </svg>`;
}

function doc(): string {
  return `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
  :root{--navy:#004375;--brand:#208aef;--terra:#d07a29;--green:#2f7d5b;--ink:#1a2430;--muted:#5a6775;--line:#e6eaf1}
  *{box-sizing:border-box}
  body{font-family:'Plus Jakarta Sans',-apple-system,sans-serif;color:var(--ink);margin:0}
  h1{font-size:30px;margin:0;letter-spacing:-.02em}
  h2{font-size:19px;margin:0 0 4px;letter-spacing:-.01em}
  h3{font-size:13px;margin:0 0 8px;color:var(--brand);text-transform:uppercase;letter-spacing:.11em;font-weight:800}
  p{line-height:1.55;color:#31405a;font-size:13px;margin:6px 0}
  .cover{background:var(--navy);color:#fff;padding:52px 44px;border-radius:14px;margin-bottom:26px}
  .cover .eyebrow{color:#e7b98a;font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700}
  .cover h1{color:#fff;font-size:38px;margin-top:10px}
  .cover .sub{color:#9fb0c6;font-size:15px;margin-top:8px;max-width:560px;line-height:1.5}
  .section{page-break-inside:avoid;margin:0 0 26px}
  .lead{color:var(--muted);font-size:13px;margin:2px 0 12px}
  ul{margin:6px 0 0;padding-left:18px}
  li{font-size:12.5px;line-height:1.65;margin:3px 0}
  .k{font-weight:700}
  .pb{page-break-before:always}
  .card{border:1px solid var(--line);border-radius:14px;padding:18px;background:#fff}
  .rule{height:1px;background:var(--line);margin:20px 0}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-top:6px}
  th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line)}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:800}
  td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
  tr.tot td{border-top:2px solid var(--ink);border-bottom:none;font-weight:800}
  .who{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .who .card{padding:14px}
  .tag{display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;margin-bottom:6px}
  .step{display:flex;gap:12px;margin:10px 0}
  .num{flex:none;width:26px;height:26px;border-radius:999px;background:var(--navy);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
  .step h4{margin:0;font-size:14px}
  .step p{margin:2px 0 0;font-size:12.5px}
  .amount{color:var(--terra);font-weight:800}
  .green{color:var(--green)}
  .navy{color:var(--navy)}
  </style></head><body>

  <div class="cover">
    <div class="eyebrow">Settlement model · Zamboanga City pilot</div>
    <h1>How the money flows</h1>
    <div class="sub">The platform intermediates every peso: the customer pays, the platform holds the funds, then settles the shop and keeps its cut. One model, cash today and online later.</div>
  </div>

  <div class="section">
    <h3>The players</h3>
    <div class="who">
      <div class="card"><span class="tag" style="background:#eef4fb;color:var(--navy)">CUSTOMER</span><p style="margin:0">Pays the full order total — wash + delivery + service fee.</p></div>
      <div class="card"><span class="tag" style="background:#f7ecdf;color:var(--terra)">RIDER</span><p style="margin:0">The platform's agent. Collects cash on delivery; that money belongs to the platform, not the rider.</p></div>
      <div class="card"><span class="tag" style="background:#e7eef5;color:var(--navy)">PLATFORM</span><p style="margin:0">Holds all funds. Settles the shop weekly and retains commission + fees. Pays riders.</p></div>
      <div class="card"><span class="tag" style="background:#eaf3ee;color:var(--green)">LAUNDRY SHOP</span><p style="margin:0">Earns its wash rate minus the platform commission. Paid out weekly in a batch.</p></div>
    </div>
  </div>

  <div class="section">
    <h3>The flow</h3>
    <h2>Customer → Platform → Shop &amp; Platform</h2>
    <p class="lead">The customer's mental model is "I paid the laundry." Operationally the platform's own rider collects and the platform settles everyone — so the platform holds the money in between.</p>
    <div class="card">${diagram()}</div>
  </div>

  <div class="section pb">
    <h3>Step by step</h3>
    <div class="step"><div class="num">1</div><div><h4>Customer pays — cash on delivery</h4><p>The rider delivers the clean laundry and collects the <span class="k">full order total</span> in cash. (Online payment lands later — same shape, straight to the platform's account.)</p></div></div>
    <div class="step"><div class="num">2</div><div><h4>Rider deposits the collected cash</h4><p>The rider is a conduit — every peso of COD is owed back to the platform. <span class="k">Rider cash reconciliation</span> tracks <span class="navy">collected − deposited = outstanding</span>. Ops records each deposit; a rider can't quietly hold float.</p></div></div>
    <div class="step"><div class="num">3</div><div><h4>Platform pays the shop — weekly</h4><p>Every delivered order writes a payout line (<span class="k">wash earnings − commission</span>). Once a week those lines close into one <span class="green">per-shop batch</span>; ops transfers it and marks it paid with a bank/e-wallet reference.</p></div></div>
    <div class="step"><div class="num">4</div><div><h4>Platform keeps its cut</h4><p>What's left is platform revenue: <span class="k">commission + delivery fee + service fee</span>. Rider pay is funded from the delivery fee.</p></div></div>
  </div>

  <div class="section">
    <h3>Worked example</h3>
    <h2>A ₱197 order, split</h2>
    <p class="lead">Medium load, 6&nbsp;kg at ₱25/kg, 0.6&nbsp;km delivery, 12% commission on the wash.</p>
    <table>
      <tr><th>Line</th><th></th><th style="text-align:right">Amount</th></tr>
      <tr><td>Wash</td><td style="color:var(--muted)">6 kg × ₱25</td><td class="n">₱150.00</td></tr>
      <tr><td>Delivery</td><td style="color:var(--muted)">distance-based</td><td class="n">₱40.00</td></tr>
      <tr><td>Service fee</td><td style="color:var(--muted)">flat</td><td class="n">₱7.00</td></tr>
      <tr class="tot"><td>Customer pays</td><td></td><td class="n">₱197.00</td></tr>
    </table>
    <div class="rule"></div>
    <table>
      <tr><th>Who gets what</th><th></th><th style="text-align:right">Amount</th></tr>
      <tr><td class="green">Shop keeps</td><td style="color:var(--muted)">wash ₱150 − commission ₱18</td><td class="n green">₱132.00</td></tr>
      <tr><td class="navy">Platform commission</td><td style="color:var(--muted)">12% of wash</td><td class="n">₱18.00</td></tr>
      <tr><td class="navy">Platform delivery</td><td style="color:var(--muted)">funds rider pay</td><td class="n">₱40.00</td></tr>
      <tr><td class="navy">Platform service</td><td style="color:var(--muted)">flat</td><td class="n">₱7.00</td></tr>
      <tr class="tot"><td>Platform gross</td><td style="color:var(--muted)">18 + 40 + 7</td><td class="n">₱65.00</td></tr>
    </table>
    <p style="margin-top:10px">The rider collects the whole <span class="amount">₱197</span> and deposits it. The platform then pays the shop <span class="green">₱132</span> in the weekly batch and retains <span class="navy">₱65</span> — out of which the rider's delivery pay comes.</p>
  </div>

  <div class="section pb">
    <h3>Rider cash reconciliation</h3>
    <h2>What the rider owes vs deposits</h2>
    <p class="lead">Every paid-cash order is COD the rider collected on the platform's behalf. Ops sees the running balance and records deposits when the rider hands cash back.</p>
    <table>
      <tr><th>Rider</th><th style="text-align:right">Collected</th><th style="text-align:right">Deposited</th><th style="text-align:right">Outstanding</th></tr>
      <tr><td>Rider One</td><td class="n">₱197.00</td><td class="n">₱150.00</td><td class="n" style="color:var(--terra)">₱47.00</td></tr>
    </table>
    <ul>
      <li><span class="k">Outstanding = collected − deposited.</span> Positive means the rider still holds platform cash.</li>
      <li>A rider withdrawal (their pay) is a <span class="k">separate</span> ledger from COD collection — pay is owed by the platform, COD is owed to it.</li>
      <li>Backed by <span class="k">paidCashAt</span> per order + a <span class="k">RiderCashDeposit</span> record per hand-off.</li>
    </ul>
  </div>

  <div class="section">
    <h3>Shop settlement</h3>
    <h2>Weekly payout batches</h2>
    <ul>
      <li>Each delivered order writes a <span class="k">RemittanceLine</span> = wash value − commission (the shop's earnings).</li>
      <li>A weekly close groups a shop's unbatched lines into one <span class="k">RemittanceBatch</span> with the total owed.</li>
      <li>Ops transfers the money externally (bank / e-wallet) and <span class="k">marks the batch paid</span> with the reference — the batch tracks intent + proof, not an automated transfer at launch.</li>
      <li>Payout direction is platform → shop; the shop never has to chase the platform for its cut.</li>
    </ul>
  </div>

  <div class="section">
    <h3>Cash today, online later</h3>
    <div class="card">
      <p style="margin:0 0 6px"><span class="k">Launch = cash on delivery.</span> The rider collects, deposits, the platform settles. Fully working today.</p>
      <p style="margin:0"><span class="k">Fast-follow = online (PayMongo).</span> Same model, one hop shorter: the customer pays the platform directly (GCash / Maya / card / QR Ph), so there's no rider-cash step for that order. Settlement to the shop is identical.</p>
    </div>
  </div>

  </body></html>`;
}
