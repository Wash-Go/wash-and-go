import {
  formatPhMobile,
  normalizePhMobile,
  type OwnerShopView,
  type PutShopServiceBody,
  type ShopCatalogItem,
  type ShopHoursDay,
  type ShopServiceRow,
  type UpdateOnboardingBody,
  type UploadsStatus,
} from '@wash-and-go/domain';
import { parseRate, parseTurnaround, rateError, turnaroundError, type ServiceDraft } from './wizard-services';

// Pure logic for the onboarding wizard (plan A4): where to resume, per-step
// validation with human copy, the PATCH / PUT bodies each step saves, and the
// submit 400 "Please add: …" labels mapped back to steps. Steps are 0-based
// indexes into WIZARD_STEPS: 0 Details, 1 Location, 2 Services, 3 Hours,
// 4 Documents, 5 Review.

export const STEP = { details: 0, location: 1, services: 2, hours: 3, documents: 4, review: 5 } as const;

// The API's placeholder name for a fresh draft (POST /shop/onboarding/start).
export const DEFAULT_SHOP_NAME = 'My laundry';
export const MAX_DESCRIPTION = 500;
export const MAX_NAME = 120;
export const MAX_ADDRESS = 200;
export const MAX_EXPRESS_SLOTS = 50;

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type Day = ShopHoursDay['day'];
// Form row: a closed day keeps its last times so re-opening it restores them.
export type HoursRow = { day: Day; open: boolean; from: string; to: string };

export type WizardDraft = {
  name: string;
  contactPhone: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  services: ServiceDraft[];
  hours: HoursRow[];
  expressSlots: string;
  permitKey: string | null;
  photoKeys: string[];
  accurate: boolean;
};

export type StepErrors = Record<string, string>;

const DAYS: Day[] = [0, 1, 2, 3, 4, 5, 6];

// ---------- Hours ----------

export function defaultHours(): HoursRow[] {
  return DAYS.map((day) => ({ day, open: day !== 0, from: '08:00', to: '18:00' }));
}

export function hoursFromApi(hours: ShopHoursDay[] | null): HoursRow[] {
  if (!hours) return defaultHours();
  const base = defaultHours();
  for (const h of hours) {
    const d = base[h.day];
    if (!d) continue;
    base[h.day] = h.open && h.close ? { day: h.day, open: true, from: h.open, to: h.close } : { ...d, open: false };
  }
  return base;
}

export function hoursToApi(rows: HoursRow[]): ShopHoursDay[] {
  return rows.map((r) => (r.open ? { day: r.day, open: r.from, close: r.to } : { day: r.day, open: null, close: null }));
}

// "Copy Monday to weekdays": Tuesday–Friday take Monday's row.
export function copyMondayToWeekdays(rows: HoursRow[]): HoursRow[] {
  const mon = rows[1];
  return rows.map((r) => (r.day >= 2 && r.day <= 5 ? { ...mon, day: r.day } : r));
}

// ---------- Server → form ----------

function pinOf(shop: OwnerShopView): { lat: number | null; lng: number | null } {
  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return { lat: null, lng: null };
  return { lat, lng };
}

export function draftFromServer(shop: OwnerShopView, catalog: ShopCatalogItem[], services: ShopServiceRow[]): WizardDraft {
  const pin = pinOf(shop);
  return {
    name: shop.name === DEFAULT_SHOP_NAME ? '' : shop.name,
    contactPhone: shop.contactPhone ? formatPhMobile(shop.contactPhone) : '',
    description: shop.description ?? '',
    address: shop.address,
    lat: pin.lat,
    lng: pin.lng,
    services: servicesFromServer(catalog, services),
    hours: hoursFromApi(shop.hours),
    expressSlots: String(shop.expressSlotsPerDay ?? 0),
    permitKey: shop.permitKey,
    photoKeys: [...shop.photoKeys],
    accurate: false,
  };
}

// Every catalog item as a form row, with the shop's saved rate (on when active).
export function servicesFromServer(catalog: ShopCatalogItem[], services: ShopServiceRow[]): ServiceDraft[] {
  return catalog.map((c) => {
    const row = services.find((s) => s.serviceId === c.id);
    return {
      serviceId: c.id,
      code: c.code,
      name: c.name,
      billingUnit: c.billingUnit,
      enabled: !!row?.active,
      rate: row ? row.ratePhp : '',
      turnaround: row ? String(row.turnaroundHours) : '24',
    };
  });
}

// ---------- Resume ----------

// Completion per step, from what the API has stored. Documents count as done
// while uploads are off (plan: verified in person); Review is never "done".
export function stepStatus(shop: OwnerShopView, services: ShopServiceRow[], uploads: UploadsStatus): boolean[] {
  const name = shop.name.trim();
  const pin = pinOf(shop);
  return [
    !!name && name !== DEFAULT_SHOP_NAME && !!shop.contactPhone,
    !!shop.address.trim() && pin.lat != null,
    services.some((s) => s.active),
    !!shop.hours,
    uploads.configured ? !!shop.permitKey : true,
    false,
  ];
}

export function firstIncompleteStep(shop: OwnerShopView, services: ShopServiceRow[], uploads: UploadsStatus): number {
  const i = stepStatus(shop, services, uploads).findIndex((done) => !done);
  return i === -1 ? STEP.review : i;
}

// ---------- Submit 400 → steps ----------

const LABEL_STEP: Record<string, number> = {
  'shop name': STEP.details,
  'contact phone': STEP.details,
  address: STEP.location,
  'map location': STEP.location,
  services: STEP.services,
  'business permit': STEP.documents,
};

export function missingLabelToStep(label: string): number | null {
  const s = LABEL_STEP[label.trim().toLowerCase()];
  return s ?? null;
}

// "Please add: shop name, map location" → ['shop name', 'map location'].
export function parseMissingLabels(message: string): string[] {
  const m = message.match(/please add:\s*(.+)$/i);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
}

export function submitErrorSteps(message: string): { label: string; step: number }[] {
  return parseMissingLabels(message)
    .map((l) => ({ label: l.charAt(0).toUpperCase() + l.slice(1), step: missingLabelToStep(l) }))
    .filter((x): x is { label: string; step: number } => x.step != null);
}

// Rejection reasons are free text from ops. Match the submit labels plus a few
// plain words per step; the earliest step wins; nothing matched → step 1.
const REASON_WORDS: [RegExp, number][] = [
  [/\b(shop name|name|contact phone|phone|mobile|number|description)\b/i, STEP.details],
  [/\b(address|map location|location|pin|map|landmark)\b/i, STEP.location],
  [/\b(services?|rates?|prices?|turnaround)\b/i, STEP.services],
  [/\b(hours|opening|closing|slots?|capacity|express)\b/i, STEP.hours],
  [/\b(business permit|permit|documents?|photos?|storefront)\b/i, STEP.documents],
];

export function stepFromRejection(reason: string | null | undefined): number {
  if (!reason) return STEP.details;
  for (const [re, step] of REASON_WORDS) if (re.test(reason)) return step;
  return STEP.details;
}

// ---------- Validation ----------

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateStep(step: number, d: WizardDraft, uploads: UploadsStatus): StepErrors {
  const e: StepErrors = {};
  if (step === STEP.details) {
    const name = d.name.trim();
    if (!name || name === DEFAULT_SHOP_NAME) e.name = 'Enter your laundry’s name.';
    else if (name.length > MAX_NAME) e.name = 'Keep the name to 120 characters.';
    if (!normalizePhMobile(d.contactPhone)) e.contactPhone = 'Enter a PH mobile number, e.g. 0917 123 4567.';
    if (d.description.trim().length > MAX_DESCRIPTION) e.description = 'Keep the description to 500 characters.';
  } else if (step === STEP.location) {
    const addr = d.address.trim();
    if (!addr) e.address = 'Search for your address or type it in.';
    else if (addr.length > MAX_ADDRESS) e.address = 'Keep the address to 200 characters.';
    if (d.lat == null || d.lng == null || (d.lat === 0 && d.lng === 0)) e.pin = 'Place the pin on your shop.';
  } else if (step === STEP.services) {
    Object.assign(e, validateServices(d.services));
  } else if (step === STEP.hours) {
    for (const h of d.hours) {
      if (!h.open) continue;
      if (!TIME.test(h.from) || !TIME.test(h.to)) e[`hours:${h.day}`] = 'Set opening and closing times.';
      else if (h.from >= h.to) e[`hours:${h.day}`] = 'Closing time must be after opening time.';
    }
    if (!d.hours.some((h) => h.open)) e.hours = 'Open at least one day.';
    const slots = d.expressSlots.trim();
    if (!/^\d+$/.test(slots) || Number(slots) > MAX_EXPRESS_SLOTS) e.expressSlots = 'Enter a number from 0 to 50.';
  } else if (step === STEP.documents) {
    if (uploads.configured && !d.permitKey) e.permit = 'Add a photo or PDF of your business permit.';
  } else if (step === STEP.review) {
    if (!d.accurate) e.accurate = 'Tick the box to confirm your details are accurate.';
  }
  return e;
}

// Services rules (wizard step 3 and the Services page): at least one on, and
// each enabled row's rate and turnaround within the PUT caps.
export function validateServices(services: ServiceDraft[]): StepErrors {
  const e: StepErrors = {};
  const on = services.filter((s) => s.enabled);
  if (!on.length) e.services = 'Turn on at least one service.';
  for (const s of on) {
    const r = rateError(s.rate);
    if (r) e[`rate:${s.serviceId}`] = r;
    const t = turnaroundError(s.turnaround);
    if (t) e[`turnaround:${s.serviceId}`] = t;
  }
  return e;
}

// ---------- What each step saves ----------

export function detailsPatch(d: WizardDraft): UpdateOnboardingBody {
  return {
    name: d.name.trim(),
    contactPhone: normalizePhMobile(d.contactPhone) ?? d.contactPhone.trim(),
    description: d.description.trim(),
  };
}

export function locationPatch(d: WizardDraft): UpdateOnboardingBody {
  return { address: d.address.trim(), lat: d.lat ?? undefined, lng: d.lng ?? undefined };
}

export function hoursPatch(d: WizardDraft): UpdateOnboardingBody {
  return { hours: hoursToApi(d.hours), expressSlotsPerDay: Number(d.expressSlots.trim()) };
}

// PUT bodies for the services step: a newly enabled item, a changed rate or
// turnaround, or a saved item switched off (active:false, saved rate kept).
// active is always sent: the API rejects a body without it.
export function servicePuts(d: Pick<WizardDraft, 'services'>, saved: ShopServiceRow[]): { serviceId: string; body: PutShopServiceBody }[] {
  const out: { serviceId: string; body: PutShopServiceBody }[] = [];
  for (const s of d.services) {
    const row = saved.find((r) => r.serviceId === s.serviceId);
    if (s.enabled) {
      const body = { ratePhp: parseRate(s.rate)!, turnaroundHours: parseTurnaround(s.turnaround)!, active: true };
      if (
        !row ||
        !row.active ||
        Number(row.ratePhp) !== body.ratePhp ||
        row.turnaroundHours !== body.turnaroundHours
      ) {
        out.push({ serviceId: s.serviceId, body });
      }
    } else if (row?.active) {
      out.push({
        serviceId: s.serviceId,
        body: { ratePhp: Number(row.ratePhp), turnaroundHours: row.turnaroundHours, active: false },
      });
    }
  }
  return out;
}

// Review / under-review summary: consecutive days with the same hours grouped,
// Monday first ("Mon–Fri 08:00–18:00", "Sat 09:00–15:00", "Sun Closed").
export function hoursSummary(rows: HoursRow[]): { days: string; hours: string }[] {
  const order: Day[] = [1, 2, 3, 4, 5, 6, 0];
  const text = (r: HoursRow) => (r.open ? `${r.from}–${r.to}` : 'Closed');
  const out: { first: Day; last: Day; hours: string }[] = [];
  for (const d of order) {
    const r = rows[d];
    if (!r) continue;
    const prev = out[out.length - 1];
    if (prev && prev.hours === text(r)) prev.last = d;
    else out.push({ first: d, last: d, hours: text(r) });
  }
  return out.map((g) => ({
    days: g.first === g.last ? DAY_SHORT[g.first] : `${DAY_SHORT[g.first]}–${DAY_SHORT[g.last]}`,
    hours: g.hours,
  }));
}

// Location step: a pin move reverse-geocodes into the address line only
// until the owner has typed in that field themselves (a landmark, a fix).
// After that their text wins; picking a search result resets it.
export function pinAddressUpdate(s: { addressEdited: boolean }, label: string): string | null {
  if (s.addressEdited || !label) return null;
  return label.slice(0, MAX_ADDRESS);
}
