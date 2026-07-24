// Native-Word DOCX builder — real headings, tables, shaded cells & bullets so
// the files are fully editable in Word / Google Docs (not flat pandoc, not page
// images). Diagram + app screenshots stay embedded images (can't be a table);
// everything else is native. Run: node e2e/capture/docx-build.mjs
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, PageBreak,
} from 'docx';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const ROOT = join(HERE, '..', '..');
const img = (f) => readFileSync(join(OUT, f));

// The flow diagram is the rasterized SVG. docx.spec.ts inlines it into
// money-docx.html as a data-URI; pull it back out to a PNG if not already there.
const DIAGRAM = join(OUT, 'diagram.png');
if (!existsSync(DIAGRAM)) {
  const html = readFileSync(join(OUT, 'money-docx.html'), 'utf8');
  const m = html.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error('diagram.png missing and no data-URI in money-docx.html — run the docx.spec.ts capture first');
  writeFileSync(DIAGRAM, Buffer.from(m[1], 'base64'));
}

const C = {
  navy: '004375', brand: '208AEF', terra: 'D07A29', green: '2F7D5B',
  ink: '1A2430', muted: '5A6775', line: 'E6EAF1', navytint: 'F1F5FB', gold: 'E7B98A',
};
const FONT = 'Plus Jakarta Sans';
const CONTENT_W = 9906; // twip, A4 minus margins

// ---- borders -------------------------------------------------------------
const noEdge = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: noEdge, bottom: noEdge, left: noEdge, right: noEdge,
  insideHorizontal: noEdge, insideVertical: noEdge,
};
const lineB = (color = C.line, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

// ---- text runs -----------------------------------------------------------
const R = (text, o = {}) => new TextRun({ text, size: 22, color: C.ink, font: FONT, ...o });
const k = (text, o = {}) => R(text, { bold: true, ...o });

// ---- block helpers -------------------------------------------------------
const eyebrow = (t) => new Paragraph({
  spacing: { before: 260, after: 60 },
  children: [R(t.toUpperCase(), { color: C.brand, bold: true, size: 19, characterSpacing: 40 })],
});
const h2 = (t) => new Paragraph({
  spacing: { after: 90 }, children: [R(t, { color: C.ink, bold: true, size: 30 })],
});
const lead = (t) => new Paragraph({
  spacing: { after: 150, line: 300 }, children: [R(t, { color: C.muted, size: 22 })],
});
const p = (runs, o = {}) => new Paragraph({ spacing: { after: 110, line: 300 }, children: runs, ...o });
const bullet = (runs) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 50, line: 290 }, children: runs });
const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

function cover(eyebrowText, title, sub) {
  const cell = new TableCell({
    shading: { fill: C.navy, type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 460, bottom: 500, left: 440, right: 440 },
    borders: NO_BORDERS,
    children: [
      new Paragraph({ spacing: { after: 130 }, children: [R(eyebrowText.toUpperCase(), { color: C.gold, bold: true, size: 19, characterSpacing: 70 })] }),
      new Paragraph({ spacing: { after: 110 }, children: [R(title, { color: 'FFFFFF', bold: true, size: 60 })] }),
      new Paragraph({ children: [R(sub, { color: 'C4D2E2', size: 24 })] }),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [cell] })],
  });
}

// image paragraph, width px, height derived from natural dims
function image(file, w, h, o = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 40 }, ...o,
    children: [new ImageRun({ type: 'png', data: img(file), transformation: { width: w, height: h } })],
  });
}
const caption = (t) => new Paragraph({
  spacing: { after: 160 }, children: [R(t, { color: C.muted, size: 18, italics: true })],
});

// generic cell
function td(children, { fill, align, span, width, borders, valign, margins } = {}) {
  return new TableCell({
    children: children.map((c) => (c instanceof Paragraph ? c : new Paragraph({ alignment: align, children: c }))),
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    columnSpan: span,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    verticalAlign: valign || VerticalAlign.CENTER,
    margins: margins || { top: 70, bottom: 70, left: 110, right: 110 },
    borders: borders || { top: noEdge, left: noEdge, right: noEdge, bottom: lineB() },
  });
}
const cellP = (runs, align) => new Paragraph({ alignment: align, spacing: { after: 0 }, children: runs });

// =========================================================================
// MONEY-FLOW
// =========================================================================
function moneyDoc() {
  const players = [
    ['CUSTOMER', C.navy, 'Pays the full order total — wash + delivery + service fee.'],
    ['RIDER', C.terra, "The platform's agent. Collects cash on delivery; that money belongs to the platform, not the rider."],
    ['PLATFORM', C.navy, 'Holds all funds. Settles the shop weekly and retains commission + fees. Pays riders.'],
    ['LAUNDRY SHOP', C.green, 'Earns its wash rate minus the platform commission. Paid out weekly in a batch.'],
  ];
  const playerCell = ([tag, color, desc]) => new TableCell({
    width: { size: CONTENT_W / 2, type: WidthType.DXA },
    margins: { top: 130, bottom: 130, left: 160, right: 160 },
    borders: { top: lineB(), bottom: lineB(), left: lineB(), right: lineB() },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [R(tag, { color, bold: true, size: 18, characterSpacing: 30 })] }),
      new Paragraph({ children: [R(desc, { size: 21, color: C.ink })] }),
    ],
  });
  const playersTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [CONTENT_W / 2, CONTENT_W / 2],
    borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [playerCell(players[0]), playerCell(players[1])] }),
      new TableRow({ children: [playerCell(players[2]), playerCell(players[3])] }),
    ],
  });

  const steps = [
    ['Customer pays — cash on delivery', [R('The rider delivers the clean laundry and collects the '), k('full order total'), R(' in cash. (Online payment lands later — same shape, straight to the platform’s account.)')]],
    ['Rider deposits the collected cash', [R('The rider is a conduit — every peso of COD is owed back to the platform. '), k('Rider cash reconciliation'), R(' tracks '), k('collected − deposited = outstanding', { color: C.navy }), R('. Ops records each deposit; a rider can’t quietly hold float.')]],
    ['Platform pays the shop — weekly', [R('Every delivered order writes a payout line ('), k('wash earnings − commission'), R('). Once a week those lines close into one '), k('per-shop batch', { color: C.green }), R('; ops transfers it and marks it paid with a bank/e-wallet reference.')]],
    ['Platform keeps its cut', [R('What’s left is platform revenue: '), k('commission + delivery fee + service fee'), R('. Rider pay is funded from the delivery fee.')]],
  ];
  const stepRow = (n, [title, body]) => new TableRow({
    children: [
      new TableCell({
        width: { size: 620, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR, color: 'auto' },
        verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 0, right: 0 }, borders: NO_BORDERS,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [R(String(n), { color: 'FFFFFF', bold: true, size: 26 })] })],
      }),
      new TableCell({
        width: { size: CONTENT_W - 620, type: WidthType.DXA }, borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP,
        margins: { top: 60, bottom: 180, left: 180, right: 60 },
        children: [
          new Paragraph({ spacing: { after: 40 }, children: [R(title, { bold: true, size: 24 })] }),
          new Paragraph({ children: body.map((r) => { r.font = FONT; return r; }) }),
        ],
      }),
    ],
  });
  const stepsTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows: steps.map((s, i) => stepRow(i + 1, s)) });

  // worked-example tables
  const hCell = (t, align) => td([cellP([R(t, { color: C.muted, bold: true, size: 17, characterSpacing: 10 })], align)], { borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } });
  const money = (t, o = {}) => R(t, { bold: true, ...o });
  const rowE = (a, b, c, { total, colorC, colorA } = {}) => new TableRow({
    children: [
      td([cellP([R(a, { color: colorA, bold: !!total })])], { borders: totalB(total) }),
      td([cellP([R(b, { color: C.muted, size: 20 })])], { borders: totalB(total) }),
      td([cellP([money(c, { color: colorC })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, borders: totalB(total) }),
    ],
  });
  const totalB = (total) => total
    ? { top: lineB(C.ink, 12), left: noEdge, right: noEdge, bottom: noEdge }
    : { top: noEdge, left: noEdge, right: noEdge, bottom: lineB() };
  const table1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3800, 3200, 2906], borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [hCell('Line'), hCell(''), hCell('Amount', AlignmentType.RIGHT)] }),
      rowE('Wash', '6 kg × ₱25', '₱150.00'),
      rowE('Delivery', 'distance-based', '₱40.00'),
      rowE('Service fee', 'flat', '₱7.00'),
      rowE('Customer pays', '', '₱197.00', { total: true }),
    ],
  });
  const table2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3800, 3200, 2906], borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [hCell('Who gets what'), hCell(''), hCell('Amount', AlignmentType.RIGHT)] }),
      rowE('Shop keeps', 'wash ₱150 − commission ₱18', '₱132.00', { colorA: C.green, colorC: C.green }),
      rowE('Platform commission', '12% of wash', '₱18.00', { colorA: C.navy }),
      rowE('Platform delivery', 'funds rider pay', '₱40.00', { colorA: C.navy }),
      rowE('Platform service', 'flat', '₱7.00', { colorA: C.navy }),
      rowE('Platform gross', '18 + 40 + 7', '₱65.00', { total: true }),
    ],
  });

  // rider cash table
  const rc = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [3306, 2200, 2200, 2200], borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [
        td([cellP([R('Rider', { color: C.muted, bold: true, size: 17 })])], { borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } }),
        td([cellP([R('Collected', { color: C.muted, bold: true, size: 17 })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } }),
        td([cellP([R('Deposited', { color: C.muted, bold: true, size: 17 })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } }),
        td([cellP([R('Outstanding', { color: C.muted, bold: true, size: 17 })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } }),
      ] }),
      new TableRow({ children: [
        td([cellP([R('Rider One')])]),
        td([cellP([R('₱197.00', { bold: true })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT }),
        td([cellP([R('₱150.00', { bold: true })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT }),
        td([cellP([R('₱47.00', { bold: true, color: C.terra })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT }),
      ] }),
    ],
  });

  // cash/online callout box
  const callout = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS,
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: C.navytint, type: ShadingType.CLEAR, color: 'auto' }, borders: NO_BORDERS,
      margins: { top: 160, bottom: 160, left: 200, right: 200 },
      children: [
        p([k('Launch = cash on delivery. '), R('The rider collects, deposits, the platform settles. Fully working today.')], { spacing: { after: 80, line: 300 } }),
        p([k('Fast-follow = online (PayMongo). '), R('Same model, one hop shorter: the customer pays the platform directly (GCash / Maya / card / QR Ph), so there’s no rider-cash step for that order. Settlement to the shop is identical.')], { spacing: { after: 0, line: 300 } }),
      ],
    })] })],
  });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22, color: C.ink } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children: [
        cover('Settlement model · Zamboanga City pilot', 'How the money flows', 'The platform intermediates every peso: the customer pays, the platform holds the funds, then settles the shop and keeps its cut. One model, cash today and online later.'),
        spacer(160),
        eyebrow('The players'), spacer(40), playersTable,
        eyebrow('The flow'), h2('Customer → Platform → Shop & Platform'),
        lead('The customer’s mental model is "I paid the laundry." Operationally the platform’s own rider collects and the platform settles everyone — so the platform holds the money in between.'),
        image('diagram.png', 480, 328, { alignment: AlignmentType.CENTER }),
        pageBreak(),
        eyebrow('Step by step'), spacer(40), stepsTable,
        eyebrow('Worked example'), h2('A ₱197 order, split'),
        lead('Medium load, 6 kg at ₱25/kg, 0.6 km delivery, 12% commission on the wash.'),
        table1, spacer(160), table2, spacer(120),
        p([R('The rider collects the whole '), k('₱197', { color: C.terra }), R(' and deposits it. The platform then pays the shop '), k('₱132', { color: C.green }), R(' in the weekly batch and retains '), k('₱65', { color: C.navy }), R(' — out of which the rider’s delivery pay comes.')]),
        pageBreak(),
        eyebrow('Rider cash reconciliation'), h2('What the rider owes vs deposits'),
        lead('Every paid-cash order is COD the rider collected on the platform’s behalf. Ops sees the running balance and records deposits when the rider hands cash back.'),
        rc, spacer(120),
        bullet([k('Outstanding = collected − deposited. '), R('Positive means the rider still holds platform cash.')]),
        bullet([R('A rider withdrawal (their pay) is a '), k('separate'), R(' ledger from COD collection — pay is owed by the platform, COD is owed to it.')]),
        bullet([R('Backed by '), k('paidCashAt'), R(' per order + a '), k('RiderCashDeposit'), R(' record per hand-off.')]),
        eyebrow('Shop settlement'), h2('Weekly payout batches'),
        bullet([R('Each delivered order writes a '), k('RemittanceLine'), R(' = wash value − commission (the shop’s earnings).')]),
        bullet([R('A weekly close groups a shop’s unbatched lines into one '), k('RemittanceBatch'), R(' with the total owed.')]),
        bullet([R('Ops transfers the money externally (bank / e-wallet) and '), k('marks the batch paid'), R(' with the reference — the batch tracks intent + proof, not an automated transfer at launch.')]),
        bullet([R('Payout direction is platform → shop; the shop never has to chase the platform for its cut.')]),
        eyebrow('Cash today, online later'), spacer(40), callout,
      ],
    }],
  });
}

// =========================================================================
// COST MATRIX
// =========================================================================
function costsDoc() {
  const summ = [
    ['Today (dev)', '$0/mo', C.ink, 'Local Docker + every service on its free tier'],
    ['At launch — recurring', '~$45/mo', C.navy, 'Railway ~$20 + Vercel $20 + Firebase SMS ~$5'],
    ['One-time / yearly', '$124', C.terra, 'Apple $99/yr + Google $25 once (+ domain ~$12/yr)'],
  ];
  const summCell = ([lbl, big, color, sub]) => new TableCell({
    width: { size: CONTENT_W / 3, type: WidthType.DXA },
    borders: { top: lineB(), bottom: lineB(), left: lineB(), right: lineB() },
    margins: { top: 130, bottom: 130, left: 150, right: 150 }, verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [R(lbl.toUpperCase(), { color: C.muted, bold: true, size: 16, characterSpacing: 20 })] }),
      new Paragraph({ spacing: { after: 40 }, children: [R(big, { color, bold: true, size: 40 })] }),
      new Paragraph({ children: [R(sub, { color: C.muted, size: 18 })] }),
    ],
  });
  const summTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [CONTENT_W / 3, CONTENT_W / 3, CONTENT_W / 3], borders: NO_BORDERS,
    rows: [new TableRow({ children: summ.map(summCell) })],
  });

  const COLW = [2600, 2200, 900, 1200, 3006];
  const th = (t, align) => td([cellP([R(t, { color: C.muted, bold: true, size: 16, characterSpacing: 10 })], align)], { align, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } });
  const grp = (t) => new TableRow({ children: [new TableCell({
    columnSpan: 5, shading: { fill: C.navytint, type: ShadingType.CLEAR, color: 'auto' }, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB() },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({ children: [R(t.toUpperCase(), { color: C.navy, bold: true, size: 16, characterSpacing: 20 })] })],
  })] });
  const svcCell = (name, sub) => td([
    new Paragraph({ spacing: { after: 20 }, children: [R(name, { bold: true, size: 21 })] }),
    new Paragraph({ children: [R(sub, { color: C.muted, size: 17 })] }),
  ], { valign: VerticalAlign.TOP });
  const row = (name, sub, free, now, launch, note) => new TableRow({ children: [
    svcCell(name, sub),
    td([cellP([R(free, { size: 18 })])], { valign: VerticalAlign.TOP }),
    td([cellP([R(now, { bold: true })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, valign: VerticalAlign.TOP }),
    td([cellP([R(launch, { bold: true, color: C.navy })], AlignmentType.RIGHT)], { align: AlignmentType.RIGHT, valign: VerticalAlign.TOP }),
    td([cellP([R(note, { color: C.muted, size: 16 })])], { valign: VerticalAlign.TOP }),
  ] });

  const matrix = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: COLW, borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [th('Service'), th('Free tier'), th('Now', AlignmentType.RIGHT), th('At launch', AlignmentType.RIGHT), th('Notes')] }),
      grp('Hosting & infrastructure'),
      row('Railway', 'API (NestJS) + Postgres', '$5 trial credit, no card', '$0', '~$20/mo', 'usage-based; small API + DB'),
      row('Vercel', 'Web: admin, portal, landing', 'Hobby free (non-commercial)', '$0', '$20/mo', 'Pro required for commercial · 1 seat, $20 usage incl.'),
      row('Redis', 'Jobs, realtime, throttle', 'Upstash free / Railway usage', '$0', '$0', 'Not needed until Phase D (realtime/push) — fast-follow'),
      grp('Maps'),
      row('TomTom', 'Geocode · routing · tiles', '50k tiles + 2.5k non-tile / DAY', '$0', '$0', 'Pilot fits free tier. Overage/1k: geocode $0.75, routing $0.75+'),
      grp('Auth & notifications'),
      row('Firebase Auth', 'Email + phone OTP', 'Email free; phone: small daily free', '$0', '~$0–10/mo', 'Phone OTP = per-SMS (~₱0.5–3 ea); pennies at pilot volume'),
      row('Firebase FCM', 'Push notifications', 'Free (unlimited)', '$0', '$0', 'Lands Phase D'),
      grp('Payments (online = fast-follow)'),
      row('PayMongo', 'GCash / Maya / card / QR Ph', 'No monthly fee', '$0', '% of revenue', 'GCash 2.23% · QR Ph ~1.34% · card 3.125% + ₱13.39 · only when online launches'),
      grp('Mobile distribution'),
      row('Apple Developer', 'iOS App Store account', '—', '$0', '$99 / yr', 'Required to ship on iOS'),
      row('Google Play', 'Android account', '—', '$0', '$25 once', 'One-time, lifetime'),
      row('Expo EAS', 'Mobile build service', '15 iOS + 15 Android builds/mo', '$0', '$0', 'Free tier covers pilot; $19/mo (Starter) if frequent builds'),
      grp('Optional'),
      row('Sentry', 'Error tracking', '5k errors/mo free', '$0', '$0', 'Free tier fine at pilot'),
      row('Domain', 'washandgo.app etc.', '—', '$0', '~$12 / yr', 'Optional'),
    ],
  });

  const foot = (label, rest) => new Paragraph({ spacing: { after: 60, line: 280 }, children: [R(label + ' ', { bold: true, size: 18 }), R(rest, { color: C.muted, size: 18 })] });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22, color: C.ink } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children: [
        cover('Platform costs · Zamboanga City pilot', 'Cost & platform matrix', 'Every third-party service the stack uses, its free tier, what it costs today (all local + free tiers) and at the express launch. Deploy plan: Railway for the API, Vercel for the web apps.'),
        spacer(160), summTable, spacer(200), matrix, spacer(200),
        foot('Reading it:', 'the express (cash-only) launch runs on ~$45/mo recurring plus the one-time store accounts. Everything else stays $0 until it’s needed.'),
        foot('What scales with volume:', 'TomTom (only past 2.5k geocode/routing calls a day), Firebase phone-OTP SMS (per signup), Railway/Vercel usage (past their included credits), and Expo EAS if you build often.'),
        foot('Fast-follow costs (not at launch):', 'Redis (Phase D realtime/push), PayMongo (% of revenue when online payments go live), possibly EAS Starter ($19/mo).'),
        foot('PayMongo is revenue-linked, not fixed:', 'GCash 2.23%, QR Ph ~1.34%, cards 3.125% + ₱13.39 — a cut of each online order, nothing when it’s cash.'),
        new Paragraph({ spacing: { before: 100 }, children: [R('Prices as of July 2026 — verify at deploy; TomTom + some tiers were being revised. Currency: hosting/stores in USD, PayMongo + SMS in PHP.', { color: '9AA4B0', size: 16 })] }),
      ],
    }],
  });
}

// =========================================================================
// FEATURES  (screenshots are the content — embedded, with native text around)
// =========================================================================
function featuresDoc() {
  const DESK = [470, 327]; // 1180x820
  const PHONE = [150, 322]; // 800x1720 at 150w
  const featBullet = (bold, rest) => bullet([k(bold), R(' — ' + rest)]);

  // 3 customer phones in a row via a table
  const phoneRow = (items) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS,
    columnWidths: [CONTENT_W / 3, CONTENT_W / 3, CONTENT_W / 3],
    rows: [new TableRow({ children: items.map(([f, cap]) => new TableCell({
      borders: NO_BORDERS, verticalAlign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new ImageRun({ type: 'png', data: img(f), transformation: { width: PHONE[0], height: PHONE[1] } })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [R(cap, { color: C.muted, size: 15, italics: true })] }),
      ],
    })) })],
  });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22, color: C.ink } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children: [
        cover('Product overview · Zamboanga City pilot', 'Wash & Go', 'A scheduling-first laundry marketplace — express pickup, delivery, and settlement across four apps and one backend.'),
        spacer(160),
        eyebrow('Coverage & routing'), h2('Live map — Zamboanga City'),
        lead('Real TomTom map. Two pilot partner shops pinned; the blue outline is the active coverage zone. Bookings geocode against TomTom Search and price delivery on TomTom driving distance.'),
        image('map.png', ...DESK), caption('TomTom Maps + Search + Routing APIs · shops: Tetuan Laundry Hub, Guiwan Wash Center · coverage zone (admin-editable).'),
        pageBreak(),
        eyebrow('Customer app'), h2('Book a wash in under a minute'),
        lead('React Native / Expo. Firebase email/password auth. The customer never picks a shop — the system resolves the nearest one and prices it upfront.'),
        phoneRow([['customer-home.png', 'Dashboard — one-tap "Book a wash", active-order card.'], ['customer-book.png', 'Load size (S/M/L) + pickup — GPS, saved, or geocoded.'], ['customer-checkout.png', 'Checkout — nearest shop + distance price breakdown.']]),
        spacer(120),
        featBullet('Auto shop-match', 'nearest active shop by distance, with a manual override.'),
        featBullet('Address book', 'saved pickups, one default, prefilled at booking.'),
        featBullet('Geocoding', 'type an address, get a pinned pickup (TomTom Search).'),
        featBullet('Transparent pricing', 'wash + distance delivery + service fee, shown before confirm.'),
        featBullet('Order tracking', 'live status + full price breakdown per order.'),
        pageBreak(),
        eyebrow('New · Logistics v1.1'), h2('Two service tiers — Express & Scheduled'),
        lead('The customer picks a standardized load size; the platform routes it to the right logistics tier. Express (Tier 2, e-bike) handles same-day loads up to 6 kg; larger loads move to Scheduled (Tier 1, Piaggio batch) with a chosen pickup window. Over-threshold Express bookings are steered to Scheduled automatically.'),
        phoneRow([['customer-scheduled.png', 'Large load → Scheduled — pick a pickup window (Tier 1).'], ['customer-scheduled-checkout.png', 'Checkout — Scheduled badge + the chosen pickup time.']]),
        spacer(120),
        featBullet('Load categories', 'Small / Medium / Large map to weight estimates; the shop weighs the real load at intake.'),
        featBullet('Express ceiling', '6 kg (admin-editable). At/under → Express; over → Scheduled.'),
        featBullet('Scheduled pickup', 'customer picks a window; any load size accepted.'),
        featBullet('One booking flow', 'the tier split happens behind a single, simple booking screen.'),
        pageBreak(),
        eyebrow('Rider app'), h2('Assigned jobs, one clear next step'),
        image('rider.png', 200, 430), caption('Job board — action jobs surfaced with the next step.'),
        p([k('Two-leg '), R('Pickup → shop, then shop → customer, as separate legs.')]),
        bullet([R('Tap-through status machine (picked up → at shop → out for return → delivered).')]),
        bullet([R('Slide-to-confirm on the irreversible delivery step.')]),
        bullet([R('Cash-on-delivery collection recorded per order.')]),
        bullet([R('External navigation deep-links to pickup / shop.')]),
        pageBreak(),
        eyebrow('Shop portal'), h2('Weigh, price, process'),
        image('portal.png', ...DESK), caption('Laundry portal — the shop’s live order queue.'),
        featBullet('Weigh-in', 'enter the real weight, preview the recomputed price, confirm.'),
        featBullet('Status drive', 'at-shop → washing → ready-for-return.'),
        featBullet('Scoped queue', 'a shop sees only its own orders.'),
        pageBreak(),
        eyebrow('Admin console'), h2('Oversight, exceptions, and business rules'),
        image('admin-dispatch.png', ...DESK), caption('Dispatch board — assign a rider when auto-match falls through.'),
        image('admin-zones.png', ...DESK), caption('Zones — draw / toggle coverage areas (shape preview).'),
        image('admin-rider-cash.png', ...DESK), caption('Rider cash — COD collected vs deposited, record deposits.'),
        image('admin-config.png', ...DESK), caption('Business rules — fees, delivery params, thresholds, live (no redeploy).'),
        image('admin-payouts.png', ...DESK), caption('Shop payouts — close a period into per-shop batches, mark paid with a transfer reference.'),
        pageBreak(),
        eyebrow('Platform & backend'), h2('The engine underneath'),
        lead('NestJS + Fastify + Prisma + Postgres. Modular monolith, controller → service → repository, explicit transactions.'),
        new Paragraph({ spacing: { before: 80, after: 50 }, children: [R('Money path', { bold: true, size: 24, color: C.navy })] }),
        bullet([R('Pricing engine — Decimal math, commission by subtraction.')]),
        bullet([R('Distance delivery fee (TomTom routing; haversine fallback).')]),
        bullet([R('Express capacity — advisory lock + Manila-day window.')]),
        bullet([R('Remittance batching — per-shop payout, mark-paid.')]),
        bullet([R('Rider cash reconciliation — platform-intermediated COD.')]),
        new Paragraph({ spacing: { before: 120, after: 50 }, children: [R('Platform', { bold: true, size: 24, color: C.navy })] }),
        bullet([R('Firebase auth, role matrix, secure-by-default guards.')]),
        bullet([R('Admin-editable business rules (audited, no redeploy).')]),
        bullet([R('Zones — DB coverage polygons + point-in-polygon resolve.')]),
        bullet([R('MapsProvider boundary — TomTom now, swappable.')]),
        bullet([R('Hardened: env schema, exception filter, throttler, helmet, CORS.')]),
        new Paragraph({ spacing: { before: 140 }, children: [R('Quality: 166 backend unit + integration tests, 10 automated browser smokes across all four apps, CI on GitHub Actions. Browser smoke has caught and fixed 4 real production bugs.', { color: C.muted, size: 20 })] }),
      ],
    }],
  });
}

// ---- write ---------------------------------------------------------------
const jobs = [
  ['Wash-and-Go-Money-Flow.docx', moneyDoc],
  ['Wash-and-Go-Cost-Matrix.docx', costsDoc],
  ['Wash-and-Go-Features.docx', featuresDoc],
];
for (const [out, build] of jobs) {
  const buf = await Packer.toBuffer(build());
  writeFileSync(join(ROOT, out), buf);
  console.log(`${out}  ${(buf.length / 1024).toFixed(0)}KB`);
}
