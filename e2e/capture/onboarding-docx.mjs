// Onboarding & verification — native-Word DOCX, same theme as the money/cost/feature
// docs. A decision doc to finalize the sign-up + verification flow with the team.
// No screenshots (the flow isn't built yet). Run: node e2e/capture/onboarding-docx.mjs
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, PageBreak,
} from 'docx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const C = {
  navy: '004375', brand: '208AEF', terra: 'D07A29', green: '2F7D5B',
  ink: '1A2430', muted: '5A6775', line: 'E6EAF1', navytint: 'F1F5FB', gold: 'E7B98A',
  amber: 'B7791F', red: 'B4322A',
};
const FONT = 'Plus Jakarta Sans';
const CONTENT_W = 9906;

const noEdge = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: noEdge, bottom: noEdge, left: noEdge, right: noEdge, insideHorizontal: noEdge, insideVertical: noEdge };
const lineB = (color = C.line, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

const R = (text, o = {}) => new TextRun({ text, size: 22, color: C.ink, font: FONT, ...o });
const k = (text, o = {}) => R(text, { bold: true, ...o });

const eyebrow = (t) => new Paragraph({ spacing: { before: 260, after: 60 }, children: [R(t.toUpperCase(), { color: C.brand, bold: true, size: 19, characterSpacing: 40 })] });
const h2 = (t) => new Paragraph({ spacing: { after: 90 }, children: [R(t, { color: C.ink, bold: true, size: 30 })] });
const lead = (t) => new Paragraph({ spacing: { after: 150, line: 300 }, children: [R(t, { color: C.muted, size: 22 })] });
const p = (runs, o = {}) => new Paragraph({ spacing: { after: 110, line: 300 }, children: runs, ...o });
const bullet = (runs) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 50, line: 290 }, children: runs });
const check = (runs) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 70, line: 290 }, children: [R('☐  ', { size: 22 }), ...runs] });
const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const cellP = (runs, align) => new Paragraph({ alignment: align, spacing: { after: 0 }, children: runs });

function cover(eyebrowText, title, sub) {
  const cell = new TableCell({
    shading: { fill: C.navy, type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 460, bottom: 500, left: 440, right: 440 }, borders: NO_BORDERS,
    children: [
      new Paragraph({ spacing: { after: 130 }, children: [R(eyebrowText.toUpperCase(), { color: C.gold, bold: true, size: 19, characterSpacing: 70 })] }),
      new Paragraph({ spacing: { after: 110 }, children: [R(title, { color: 'FFFFFF', bold: true, size: 56 })] }),
      new Paragraph({ children: [R(sub, { color: 'C4D2E2', size: 24 })] }),
    ],
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows: [new TableRow({ children: [cell] })] });
}

function td(children, { fill, align, span, width, borders, valign, margins } = {}) {
  return new TableCell({
    children: children.map((c) => (c instanceof Paragraph ? c : new Paragraph({ alignment: align, children: c }))),
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    columnSpan: span, width: width ? { size: width, type: WidthType.DXA } : undefined,
    verticalAlign: valign || VerticalAlign.CENTER,
    margins: margins || { top: 70, bottom: 70, left: 110, right: 110 },
    borders: borders || { top: noEdge, left: noEdge, right: noEdge, bottom: lineB() },
  });
}

// Three role sign-up cards
function roleCards() {
  const roles = [
    ['CUSTOMER', C.navy, 'App or landing sign-up. No verification — book a wash immediately.', 'Customer app'],
    ['RIDER', C.terra, 'Signs up, then submits ID + license. Verified by admin before accepting jobs (they handle platform cash).', 'Rider app'],
    ['LAUNDRY OWNER', C.green, 'Signs up → portal login (unverified). Files proof of shop + pins the location. Verified by admin to go live.', 'Laundry portal'],
  ];
  const cell = ([tag, color, desc, where]) => new TableCell({
    width: { size: CONTENT_W / 3, type: WidthType.DXA },
    margins: { top: 140, bottom: 140, left: 150, right: 150 },
    borders: { top: lineB(), bottom: lineB(), left: lineB(), right: lineB() },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [R(tag, { color, bold: true, size: 19, characterSpacing: 30 })] }),
      new Paragraph({ spacing: { after: 80 }, children: [R(desc, { size: 20, color: C.ink })] }),
      new Paragraph({ children: [R('Signs up on: ', { color: C.muted, size: 17 }), R(where, { color: C.muted, size: 17, bold: true })] }),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [CONTENT_W / 3, CONTENT_W / 3, CONTENT_W / 3],
    borders: NO_BORDERS, rows: [new TableRow({ children: roles.map(cell) })],
  });
}

// Numbered step table (navy index column) — same shape as the money-flow steps.
function steps(list) {
  const row = (n, [title, body]) => new TableRow({ children: [
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
  ] });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows: list.map((s, i) => row(i + 1, s)) });
}

// Verification-status reference table
function statusTable() {
  const th = (t, align) => td([cellP([R(t, { color: C.muted, bold: true, size: 16, characterSpacing: 10 })], align)], { align, borders: { top: noEdge, left: noEdge, right: noEdge, bottom: lineB(C.ink, 8) } });
  const row = (state, color, meaning, visible) => new TableRow({ children: [
    td([cellP([R(state, { bold: true, color })])], { valign: VerticalAlign.TOP }),
    td([cellP([R(meaning, { size: 20 })])], { valign: VerticalAlign.TOP }),
    td([cellP([R(visible, { size: 20, color: C.muted })])], { valign: VerticalAlign.TOP }),
  ] });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1900, 4900, 3106], borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [th('State'), th('What it means'), th('Visible to customers?')] }),
      row('DRAFT', C.muted, 'Owner signed up, hasn’t filed proof + location yet.', 'No'),
      row('SUBMITTED', C.amber, 'Proof + pinned location filed — waiting in the admin review queue.', 'No'),
      row('VERIFIED', C.green, 'Admin approved. Shop is live and matchable for orders.', 'Yes (if active)'),
      row('REJECTED', C.red, 'Admin declined with a reason; owner can fix and resubmit.', 'No'),
    ],
  });
}

function calloutBox(children) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS,
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: C.navytint, type: ShadingType.CLEAR, color: 'auto' }, borders: NO_BORDERS,
      margins: { top: 160, bottom: 160, left: 200, right: 200 }, children,
    })] })],
  });
}

function onboardingDoc() {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 22, color: C.ink } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children: [
        cover('Onboarding & verification · Zamboanga City pilot', 'How people join Wash & Go',
          'Self-serve sign-up for customers, riders, and laundry owners — with an admin verification gate for the two that handle money or fulfil orders. A working draft to finalize with the team.'),
        spacer(160),

        eyebrow('Three ways in'), h2('Who signs up, and where'),
        lead('Everyone self-signs-up. The role is granted at sign-up, but riders and laundry owners can’t operate until admin verifies them — an unverified shop is invisible to customers, an unverified rider can’t accept jobs.'),
        roleCards(),
        spacer(120),
        p([k('Future — one landing sign-up. '), R('On the marketing site, a single “Sign up” reveals the three choices on hover (Grab-style), then routes to the right app or the portal. Until then, each signs up in its own app/portal.')]),
        pageBreak(),

        eyebrow('Laundry owner'), h2('Sign up → prove the shop → go live'),
        lead('The owner sets their own location — the admin should never type a shop’s address. Admin’s job is to verify what the owner submitted.'),
        steps([
          ['Sign up on the laundry portal', [R('Email + password creates a '), k('SHOP_OWNER'), R(' account and an empty, '), k('unverified', { color: C.amber }), R(' shop. They can log in immediately, but see an onboarding checklist, not the dashboard.')]],
          ['Fill business details', [R('Shop name, contact, service(s) offered and rates. (Rates are partner-set — shown to customers at booking.)')]],
          ['Pin the exact location', [R('An interactive '), k('map'), R(': search the address (autocomplete), drag the pin to the storefront, or '), k('“use my current location”'), R(' from the device GPS. Most accurate when done on a phone at the shop.')]],
          ['Upload proof', [R('Business permit + a storefront photo. Files go to '), k('private storage (Cloudflare R2)'), R('; only admin can view them.')]],
          ['Submit for review', [R('Status moves to '), k('SUBMITTED', { color: C.amber }), R('. The portal shows “Under review”. The owner is notified when a decision lands.')]],
          ['Admin verifies → live', [R('Admin approves ('), k('VERIFIED', { color: C.green }), R(', shop becomes matchable) or rejects with a reason (owner fixes + resubmits).')]],
        ]),
        pageBreak(),

        eyebrow('Verification states'), h2('What each status means'),
        lead('One lifecycle drives visibility. A shop is only matchable for real orders when VERIFIED and not manually suspended.'),
        statusTable(),
        spacer(150),
        p([k('Admin-created shops skip the queue. '), R('When ops seeds a partner shop directly (the pilot path), it’s created '), k('VERIFIED', { color: C.green }), R(' — self-serve is the scale path on top of the same model.')]),
        pageBreak(),

        eyebrow('Admin review queue'), h2('What ops sees, and decides'),
        lead('One place to clear pending shops (and later, riders).'),
        bullet([k('The submitted proof '), R('— permit + storefront photo, via a short-lived private link.')]),
        bullet([k('The pinned location on a map '), R('— confirm it’s a real storefront in the coverage zone, not a random pin.')]),
        bullet([k('Approve '), R('→ shop goes VERIFIED + active, appears to customers, owner notified.')]),
        bullet([k('Reject '), R('→ pick a reason (bad photo, out of coverage, duplicate…); owner is notified to fix + resubmit.')]),
        bullet([k('The /shops map '), R('plots every shop (verified + pending) so ops can eyeball the spread at a glance.')]),
        spacer(120),

        eyebrow('Rider (next phase)'), h2('Sign up → submit docs → verified'),
        lead('Same shape as shops. Riders handle platform cash, so verification matters — but the pilot can onboard its handful of riders by hand first.'),
        steps([
          ['Sign up on the rider app', [R('Creates a '), k('RIDER'), R(' account with an '), k('unverified', { color: C.amber }), R(' profile — can’t accept jobs yet.')]],
          ['Submit documents', [R('Driver’s license + a valid ID photo, and vehicle details (type / plate). Photos captured on-device, stored privately in R2.')]],
          ['Admin verifies', [R('Same review queue. Approved → the rider can accept jobs; rejected → resubmit.')]],
        ]),
        pageBreak(),

        eyebrow('To finalize with the team'), h2('Open decisions'),
        lead('Tick these off together — they turn this draft into the build spec.'),
        check([k('Shop proof: '), R('what exactly do we require? (Business permit only, or DTI/BIR too? A storefront photo? Owner’s ID?)')]),
        check([k('Rider proof: '), R('license + which ID? Vehicle registration/OR-CR? Any background/reference check for cash handling?')]),
        check([k('Rejection reasons: '), R('the fixed list ops picks from (out of coverage, unreadable permit, duplicate shop, wrong location…).')]),
        check([k('Verification SLA: '), R('how fast do we promise a decision? (e.g. within 2 business days.) Who reviews — one ops person or a rota?')]),
        check([k('Coverage rule: '), R('auto-reject shops pinned outside the active zone, or allow + flag for manual call?')]),
        check([k('Re-verification: '), R('do we ever re-check a live shop (permit expiry, relocation)? Can an owner edit location post-verify, or does that re-trigger review?')]),
        check([k('Suspension: '), R('grounds for pulling a verified shop/rider offline (complaints, non-payment) — and who can.')]),
        check([k('Landing sign-up: '), R('build the Grab-style role-picker now, or after the app/portal sign-ups are proven?')]),
        check([k('Rider pay model: '), R('still open (the recurring blocker) — needed to actually recruit riders.')]),
        spacer(160),

        eyebrow('Build status'), spacer(40),
        calloutBox([
          p([k('Shipped. '), R('The verification model (shop status DRAFT → SUBMITTED → VERIFIED → REJECTED) + the customer-visibility gate are live on the backend. Admin-created shops go straight to VERIFIED.')], { spacing: { after: 80, line: 300 } }),
          p([k('In progress. '), R('R2 uploads, portal self-signup + onboarding wizard (map + proof), and the admin review queue.')], { spacing: { after: 80, line: 300 } }),
          p([k('Later. '), R('Rider self-serve onboarding and the landing-page role-picker.')], { spacing: { after: 0, line: 300 } }),
        ]),
        new Paragraph({ spacing: { before: 140 }, children: [R('Draft — July 2026. Storage: Cloudflare R2 (private). Maps: TomTom. Identity: Firebase.', { color: '9AA4B0', size: 16 })] }),
      ],
    }],
  });
}

const buf = await Packer.toBuffer(onboardingDoc());
const out = join(ROOT, 'Wash-and-Go-Onboarding.docx');
writeFileSync(out, buf);
console.log(`Wash-and-Go-Onboarding.docx  ${(buf.length / 1024).toFixed(0)}KB`);
