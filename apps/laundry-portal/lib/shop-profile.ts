import { formatPhMobile, normalizePhMobile, type ShopProfileView, type UpdateShopProfileBody } from '@wash-and-go/domain';
import {
  defaultHours,
  detailsPatch,
  hoursFromApi,
  hoursPatch,
  hoursToApi,
  locationPatch,
  STEP,
  validateStep,
  type StepErrors,
  type WizardDraft,
} from './wizard';

// Shop profile (/shop) reuses the wizard's form shape, rules and PATCH bodies
// for its three editable sections; only the endpoint differs (PATCH /shop/me).

export type Section = 'profile' | 'location' | 'hours';

const STEP_OF: Record<Section, number> = { profile: STEP.details, location: STEP.location, hours: STEP.hours };
const NO_UPLOADS = { configured: false };

export function profileDraft(v: ShopProfileView): WizardDraft {
  const lat = Number(v.lat);
  const lng = Number(v.lng);
  const pin = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  return {
    name: v.name,
    contactPhone: v.contactPhone ? formatPhMobile(v.contactPhone) : '',
    description: v.description ?? '',
    address: v.address,
    lat: pin ? lat : null,
    lng: pin ? lng : null,
    services: [],
    hours: v.hours ? hoursFromApi(v.hours) : defaultHours(),
    expressSlots: String(v.expressSlotsPerDay),
    permitKey: null,
    photoKeys: [],
    accurate: true,
  };
}

export function validateSection(s: Section, d: WizardDraft): StepErrors {
  return validateStep(STEP_OF[s], d, NO_UPLOADS);
}

export function sectionPatch(s: Section, d: WizardDraft): UpdateShopProfileBody {
  if (s === 'profile') return detailsPatch(d);
  if (s === 'location') return locationPatch(d);
  return hoursPatch(d);
}

// Unsaved changes in a section, compared with what the API holds.
export function sectionDirty(s: Section, d: WizardDraft, v: ShopProfileView): boolean {
  const saved = profileDraft(v);
  if (s === 'profile') {
    const phone = normalizePhMobile(d.contactPhone) ?? d.contactPhone.trim();
    return d.name.trim() !== saved.name || phone !== (v.contactPhone ?? '') || d.description.trim() !== saved.description;
  }
  if (s === 'location') return d.address.trim() !== saved.address || d.lat !== saved.lat || d.lng !== saved.lng;
  return (
    JSON.stringify(hoursToApi(d.hours)) !== JSON.stringify(hoursToApi(saved.hours)) ||
    d.expressSlots.trim() !== saved.expressSlots ||
    v.hours == null
  );
}

export function profileErrorMessage(error: unknown): { text: string; onboarding?: boolean } {
  const st = (error as { status?: unknown } | null)?.status;
  if (st === 409) return { text: 'Your shop is still being registered. Make changes in the registration form.', onboarding: true };
  if (st === 403) return { text: 'Only the owner can change the shop profile.' };
  if (st === 400) return { text: 'Check your answers, then try again.' };
  return { text: 'We couldn’t save. Check your connection, then try again.' };
}

// React Query key for GET /shop/me (per signed-in user).
export const shopMeKey = (userId: string) => ['shop-me', userId] as const;
