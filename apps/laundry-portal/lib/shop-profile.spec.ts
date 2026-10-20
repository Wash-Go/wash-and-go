import type { ShopProfileView } from '@wash-and-go/domain';
import { hoursUnset, profileDraft, profileErrorMessage, sectionDirty, sectionPatch, validateSection } from './shop-profile';

const view: ShopProfileView = {
  id: 's1',
  name: 'Tetuan Laundry Hub',
  address: 'Tetuan, Zamboanga City',
  lat: '6.911100',
  lng: '122.079400',
  contactPhone: '+639171234567',
  description: null,
  hours: [
    { day: 0, open: null, close: null },
    { day: 1, open: '07:00', close: '19:00' },
    { day: 2, open: '07:00', close: '19:00' },
    { day: 3, open: '07:00', close: '19:00' },
    { day: 4, open: '07:00', close: '19:00' },
    { day: 5, open: '07:00', close: '19:00' },
    { day: 6, open: '07:00', close: '19:00' },
  ],
  expressSlotsPerDay: 8,
  status: 'VERIFIED',
  verifiedAt: '2026-10-03T00:00:00Z',
  payoutAccount: null,
  myRole: 'OWNER',
  logoKey: null,
  logoUrl: null,
};

describe('profileDraft', () => {
  it('reuses the wizard form shape: local phone, numeric pin, hours rows', () => {
    const d = profileDraft(view);
    expect(d.name).toBe('Tetuan Laundry Hub');
    expect(d.contactPhone).toBe('0917 123 4567');
    expect(d.lat).toBeCloseTo(6.9111);
    expect(d.hours[1]).toEqual({ day: 1, open: true, from: '07:00', to: '19:00' });
    expect(d.hours[0].open).toBe(false);
    expect(d.expressSlots).toBe('8');
  });
  it('shows default hours when none are set', () => {
    expect(profileDraft({ ...view, hours: null }).hours[1]).toEqual({ day: 1, open: true, from: '08:00', to: '18:00' });
  });
});

describe('sections', () => {
  it('validates each section with the wizard rules', () => {
    const d = profileDraft(view);
    expect(validateSection('profile', { ...d, contactPhone: '12' })).toEqual({
      contactPhone: 'Enter a PH mobile number, e.g. 0917 123 4567.',
    });
    expect(validateSection('location', { ...d, address: '' }).address).toBeDefined();
    expect(validateSection('hours', { ...d, expressSlots: '99' }).expressSlots).toBeDefined();
    expect(validateSection('profile', d)).toEqual({});
  });

  it('builds the PATCH /shop/me body for a section', () => {
    const d = { ...profileDraft(view), contactPhone: '0918 000 1111' };
    expect(sectionPatch('profile', d)).toEqual({ name: 'Tetuan Laundry Hub', contactPhone: '+639180001111', description: '' });
    expect(sectionPatch('location', d)).toEqual({ address: 'Tetuan, Zamboanga City', lat: 6.9111, lng: 122.0794 });
    expect(sectionPatch('hours', d)).toMatchObject({ expressSlotsPerDay: 8 });
  });

  it('knows when a section has unsaved changes', () => {
    const d = profileDraft(view);
    expect(sectionDirty('profile', d, view)).toBe(false);
    expect(sectionDirty('profile', { ...d, contactPhone: '0918 000 1111' }, view)).toBe(true);
    expect(sectionDirty('profile', { ...d, contactPhone: '09171234567' }, view)).toBe(false);
    expect(sectionDirty('location', { ...d, lat: 6.92 }, view)).toBe(true);
    const hours = d.hours.map((h) => (h.day === 6 ? { ...h, open: false } : h));
    expect(sectionDirty('hours', { ...d, hours }, view)).toBe(true);
    expect(sectionDirty('hours', d, view)).toBe(false);
  });

  it('a shop with no hours yet is not dirty until the owner changes something', () => {
    const unset = { ...view, hours: null };
    const d = profileDraft(unset);
    expect(sectionDirty('hours', d, unset)).toBe(false);
    const hours = d.hours.map((h) => (h.day === 0 ? { ...h, open: true } : h));
    expect(sectionDirty('hours', { ...d, hours }, unset)).toBe(true);
    expect(hoursUnset(unset)).toBe(true);
    expect(hoursUnset(view)).toBe(false);
  });
});

describe('profileErrorMessage', () => {
  it('sends a shop still in onboarding to the wizard', () => {
    expect(profileErrorMessage({ status: 409 })).toEqual({
      text: 'Your shop is still being registered. Make changes in the registration form.',
      onboarding: true,
    });
  });
  it('other errors are human copy', () => {
    expect(profileErrorMessage({ status: 403 }).text).toBe('Only the owner can change the shop profile.');
    expect(profileErrorMessage({ status: 400 }).text).toBe('Check your answers, then try again.');
    expect(profileErrorMessage(new Error('x')).text).toBe('We couldn’t save. Check your connection, then try again.');
  });
});
