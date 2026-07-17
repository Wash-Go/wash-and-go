# Landing Page — Business Info Needed

Open business decisions and missing data the public landing page depends on.
Everything here is currently shown as **indicative / placeholder** because no
founder-approved data exists yet (per Notion `BUSINESS_RULES_PROPOSED`).

Status legend: 🔴 blocking accurate content · 🟡 improves credibility · ⚪ nice-to-have

Last updated: 2026-07-17. Owner: founders (CEO approves rate card).

---

## 1. Rate card 🔴

All figures below are shown on `/pricing` and `/services` with an "indicative /
proposed" disclaimer. They need real approval before the disclaimer comes off.

| Item | Shown on site (indicative) | Decision needed |
| --- | --- | --- |
| Wash rate | ≈ ₱25 / kg (range ₱22–30) | Final per-kg rate |
| Scheduled delivery fee | ₱40 | Confirm; flat or distance-tiered within zone? |
| Express delivery fee | ₱65–80 | Pick the number(s) + the express turnaround promise |
| Service fee | ₱7 flat | Confirm; **per order or per bag?** (open in PLAN §7) |
| Wash + iron | ₱220–280 / 8 kg | Platform rate or per-shop? |
| Dry cleaning | ₱80–150 / piece | Platform rate or per-shop? |
| Wedding gown care | ₱500–1,200 / piece | Platform rate or per-shop? |
| Commission | 12% (not shown publicly) | Confirm — affects shop-facing copy later |

**Key ambiguity:** if catalogue prices are **per-shop**, the public site cannot
show a single number — it must say "from ₱X" or "varies by shop." Decide the
model before the rate card is presented as firm.

---

## 2. Coverage area 🔴

The onboarding site's core job (ADR-002) is "check if we cover your area," but
there is no defined service-zone list or map yet.

- Current copy says "inside our service area" vaguely.
- **Needed:** the launch coverage list (barangays / zones) so we can build a
  real coverage-check section and set honest expectations.
- Ties to the maps-provider decision (D10, still open) for any map UI.

---

## 3. Service guarantees 🟡

The site currently makes **no** turnaround or quality claims (deliberately —
nothing is approved).

- Turnaround time per service (e.g. "24h wash & fold")? Scheduled vs Express?
- Quality / re-do promise?
- What happens on late, lost, or damaged orders (liability line)?
- Express "promise" specifically is still open (BUSINESS_RULES).

---

## 4. Payment wording 🟡

`/pricing` and `/book-order` say "pay in the app after your laundry is weighed."

- That fits digital (GCash/Maya/card). **Cash orders** pay at delivery, not at
  weigh-in — if cash is offered publicly, the copy needs a caveat.
- Confirm which payment methods are advertised at launch.

---

## 5. Promotions / stored value ⚪

Credits, vouchers, and promo packs exist in the plan but are not on the site.

- Any launch offer to advertise (first-order discount, credit pack bonus)?
- Voucher / credit terms (expiry, refundability) need approval before any public
  mention (BUSINESS_RULES).

---

## 6. App store links 🔴 (for launch)

Footer + all "Get the App" CTAs are placeholders ("coming soon").

- Real Google Play + App Store URLs once the customer app is published.

---

## 7. Stats / social proof 🟡

The hero shows "100,000+ pounds cleaned / 500+ orders / 1000+ satisfied
clients" (carried from the Figma design).

- These are **fabricated pre-launch numbers.** Decide: keep as aspirational
  design, replace with real figures post-launch, or remove until we have data.
  Pre-launch vanity metrics are a credibility risk if a partner or grant
  reviewer notices.

---

## 8. Contact / support ⚪

No contact info, support channel, or business address on the site.

- Support email / phone / Messenger for onboarding questions?
- Business registration line for the footer (DOST AZUL Hub affiliation is shown;
  legal entity name is not).

---

## How to use this file

When a decision lands, update the relevant page and delete or strike the row
here. When all 🔴 items are resolved, the pricing/services disclaimers can be
removed and the coverage-check section can ship.
