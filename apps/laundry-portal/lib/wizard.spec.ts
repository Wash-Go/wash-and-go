import type { OwnerShopView, ShopCatalogItem, ShopHoursDay, ShopServiceRow } from '@wash-and-go/domain';
import {
  copyMondayToWeekdays,
  defaultHours,
  detailsPatch,
  draftFromServer,
  firstIncompleteStep,
  hoursFromApi,
  hoursPatch,
  hoursSummary,
  hoursToApi,
  locationPatch,
  missingLabelToStep,
  parseMissingLabels,
  servicePuts,
  stepFromRejection,
  stepStatus,
  submitErrorSteps,
  validateStep,
  type WizardDraft,
} from './wizard';

const shop = (over: Partial<OwnerShopView> = {}): OwnerShopView => ({
  id: 's1',
  name: 'My laundry',
  address: '',
  lat: '0',
  lng: '0',
  status: 'DRAFT',
  rejectionReason: null,
  permitKey: null,
  photoKeys: [],
  submittedAt: null,
  verifiedAt: null,
  contactPhone: null,
  description: null,
  hours: null,
  expressSlotsPerDay: 0,
  documentsPending: false,
  ...over,
});

const week: ShopHoursDay[] = [
  { day: 0, open: null, close: null },
  { day: 1, open: '08:00', close: '18:00' },
  { day: 2, open: '08:00', close: '18:00' },
  { day: 3, open: '08:00', close: '18:00' },
  { day: 4, open: '08:00', close: '18:00' },
  { day: 5, open: '08:00', close: '18:00' },
  { day: 6, open: '09:00', close: '15:00' },
];

const complete = shop({
  name: 'Tetuan Laundry Hub',
  contactPhone: '+639171234567',
  address: 'Don Alfaro St., Tetuan',
  lat: '6.9111',
  lng: '122.0794',
  hours: week,
});

const catalog: ShopCatalogItem[] = [
  { id: 'c-dc', code: 'DRY_CLEAN', name: 'Dry Cleaning', billingUnit: 'PER_PIECE' },
  { id: 'c-wdf', code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG' },
];

const row = (over: Partial<ShopServiceRow> = {}): ShopServiceRow => ({
  id: 'r1',
  serviceId: 'c-wdf',
  code: 'WDF',
  name: 'Wash, Dry & Fold',
  billingUnit: 'PER_KG',
  ratePhp: '25.00',
  turnaroundHours: 24,
  active: true,
  ...over,
});

const up = { configured: false };

describe('stepStatus / firstIncompleteStep', () => {
  it('opens a fresh draft on step 1 (details)', () => {
    expect(firstIncompleteStep(shop(), [], up)).toBe(0);
    expect(stepStatus(shop(), [], up)).toEqual([false, false, false, false, true, false]);
  });

  it('treats the API default name "My laundry" as not done', () => {
    expect(firstIncompleteStep(shop({ contactPhone: '+639171234567' }), [], up)).toBe(0);
  });

  it('moves to location once name and phone are set', () => {
    const s = shop({ name: 'Tetuan Laundry Hub', contactPhone: '+639171234567' });
    expect(firstIncompleteStep(s, [], up)).toBe(1);
  });

  it('needs an address and a pin that is not 0,0 for location', () => {
    const s = shop({ name: 'A', contactPhone: '+639171234567', address: 'Tetuan' });
    expect(firstIncompleteStep(s, [], up)).toBe(1);
    expect(firstIncompleteStep({ ...s, lat: '6.9', lng: '122.0' }, [], up)).toBe(2);
  });

  it('needs one active service row for services', () => {
    expect(firstIncompleteStep(complete, [row({ active: false })], up)).toBe(2);
    expect(firstIncompleteStep(complete, [row()], up)).toBe(5);
  });

  it('needs hours set for step 4', () => {
    expect(firstIncompleteStep({ ...complete, hours: null }, [row()], up)).toBe(3);
  });

  it('documents are done when uploads are off, and need the permit when on', () => {
    expect(firstIncompleteStep(complete, [row()], { configured: true })).toBe(4);
    expect(firstIncompleteStep({ ...complete, permitKey: 'uploads/u/p.pdf' }, [row()], { configured: true })).toBe(5);
  });

  it('the review step is never complete before submit', () => {
    expect(stepStatus(complete, [row()], up)[5]).toBe(false);
  });
});

describe('submit error labels', () => {
  it('parses "Please add: …" into labels', () => {
    expect(parseMissingLabels('Please add: shop name, map location, business permit')).toEqual([
      'shop name',
      'map location',
      'business permit',
    ]);
    expect(parseMissingLabels('Something else')).toEqual([]);
  });

  it('maps each API label to its wizard step', () => {
    expect(missingLabelToStep('shop name')).toBe(0);
    expect(missingLabelToStep('contact phone')).toBe(0);
    expect(missingLabelToStep('address')).toBe(1);
    expect(missingLabelToStep('map location')).toBe(1);
    expect(missingLabelToStep('services')).toBe(2);
    expect(missingLabelToStep('business permit')).toBe(4);
    expect(missingLabelToStep('Business Permit ')).toBe(4);
    expect(missingLabelToStep('a unicorn')).toBeNull();
  });

  it('turns a submit 400 into human lines with steps', () => {
    expect(submitErrorSteps('Please add: address, services')).toEqual([
      { label: 'Address', step: 1 },
      { label: 'Services', step: 2 },
    ]);
  });
});

describe('stepFromRejection', () => {
  it('opens the step the reason names', () => {
    expect(stepFromRejection('The business permit photo is blurry')).toBe(4);
    expect(stepFromRejection('Your map location is in the sea')).toBe(1);
    expect(stepFromRejection('Contact phone did not answer')).toBe(0);
    expect(stepFromRejection('Your rates look too low, please check your services')).toBe(2);
    expect(stepFromRejection('Please fix your opening hours')).toBe(3);
  });

  it('falls back to step 1 when nothing matches or there is no reason', () => {
    expect(stepFromRejection('We could not verify you')).toBe(0);
    expect(stepFromRejection(null)).toBe(0);
  });

  it('picks the earliest step when several match', () => {
    expect(stepFromRejection('Wrong address and missing business permit')).toBe(1);
  });
});

describe('hours', () => {
  it('defaults to Mon–Sat 8am–6pm, Sunday closed', () => {
    const h = defaultHours();
    expect(h).toHaveLength(7);
    expect(h[0]).toEqual({ day: 0, open: false, from: '08:00', to: '18:00' });
    expect(h[1]).toEqual({ day: 1, open: true, from: '08:00', to: '18:00' });
    expect(h[6].open).toBe(true);
  });

  it('round-trips the API grid', () => {
    expect(hoursToApi(hoursFromApi(week))).toEqual(week);
    expect(hoursFromApi(null)).toEqual(defaultHours());
  });

  it('keeps the last times of a closed day in the form but sends null', () => {
    const rows = defaultHours();
    rows[1] = { ...rows[1], open: false };
    expect(hoursToApi(rows)[1]).toEqual({ day: 1, open: null, close: null });
  });

  it('copies Monday to Tuesday–Friday only', () => {
    const rows = defaultHours();
    rows[1] = { day: 1, open: true, from: '07:30', to: '20:00' };
    rows[3] = { day: 3, open: false, from: '08:00', to: '18:00' };
    const out = copyMondayToWeekdays(rows);
    for (const d of [2, 3, 4, 5]) expect(out[d]).toEqual({ day: d, open: true, from: '07:30', to: '20:00' });
    expect(out[0]).toEqual(rows[0]);
    expect(out[6]).toEqual(rows[6]);
  });
});

const draft = (over: Partial<WizardDraft> = {}): WizardDraft => ({
  ...draftFromServer(complete, catalog, [row()]),
  ...over,
});

describe('draftFromServer', () => {
  it('fills the form from the shop and lists every catalog item', () => {
    const d = draftFromServer(shop(), catalog, []);
    expect(d.name).toBe('');
    expect(d.lat).toBeNull();
    expect(d.services.map((s) => s.serviceId)).toEqual(['c-dc', 'c-wdf']);
    expect(d.services.every((s) => !s.enabled)).toBe(true);
    expect(d.expressSlots).toBe('0');
  });

  it('shows the stored phone in the local format and carries the rates', () => {
    const d = draftFromServer(complete, catalog, [row({ active: false, ratePhp: '30.50' })]);
    expect(d.name).toBe('Tetuan Laundry Hub');
    expect(d.contactPhone).toBe('0917 123 4567');
    expect(d.lat).toBeCloseTo(6.9111);
    const wdf = d.services.find((s) => s.code === 'WDF')!;
    expect(wdf).toMatchObject({ enabled: false, rate: '30.50', turnaround: '24' });
  });
});

describe('validateStep', () => {
  it('step 1: name, phone and description length', () => {
    expect(validateStep(0, draft({ name: ' ', contactPhone: '123', description: 'x'.repeat(501) }), up)).toEqual({
      name: 'Enter your laundry’s name.',
      contactPhone: 'Enter a PH mobile number, e.g. 0917 123 4567.',
      description: 'Keep the description to 500 characters.',
    });
    expect(validateStep(0, draft({ name: 'My laundry' }), up).name).toBe('Enter your laundry’s name.');
    expect(validateStep(0, draft(), up)).toEqual({});
  });

  it('step 2: address and a pin', () => {
    expect(validateStep(1, draft({ address: '', lat: null, lng: null }), up)).toEqual({
      address: 'Search for your address or type it in.',
      pin: 'Place the pin on your shop.',
    });
    expect(validateStep(1, draft({ lat: 0, lng: 0 }), up).pin).toBe('Place the pin on your shop.');
  });

  it('step 3: at least one service, with valid rate and turnaround', () => {
    const off = draft().services.map((s) => ({ ...s, enabled: false }));
    expect(validateStep(2, draft({ services: off }), up)).toEqual({ services: 'Turn on at least one service.' });
    const bad = draft().services.map((s) => (s.code === 'WDF' ? { ...s, rate: '25.555', turnaround: '721' } : s));
    expect(validateStep(2, draft({ services: bad }), up)).toEqual({
      'rate:c-wdf': 'Enter a rate up to ₱99,999.00, with at most 2 decimals.',
      'turnaround:c-wdf': 'Enter whole hours from 1 to 720.',
    });
    const zero = draft().services.map((s) => (s.code === 'WDF' ? { ...s, rate: '0' } : s));
    expect(validateStep(2, draft({ services: zero }), up)['rate:c-wdf']).toBeDefined();
  });

  it('step 4: open before close, one open day, slots 0–50', () => {
    const hours = defaultHours();
    hours[2] = { day: 2, open: true, from: '18:00', to: '08:00' };
    expect(validateStep(3, draft({ hours, expressSlots: '51' }), up)).toEqual({
      'hours:2': 'Closing time must be after opening time.',
      expressSlots: 'Enter a number from 0 to 50.',
    });
    const closed = defaultHours().map((h) => ({ ...h, open: false }));
    expect(validateStep(3, draft({ hours: closed }), up).hours).toBe('Open at least one day.');
    const blank = defaultHours();
    blank[1] = { day: 1, open: true, from: '', to: '18:00' };
    expect(validateStep(3, draft({ hours: blank }), up)['hours:1']).toBe('Set opening and closing times.');
    expect(validateStep(3, draft({ expressSlots: '2.5' }), up).expressSlots).toBeDefined();
    expect(validateStep(3, draft(), up)).toEqual({});
  });

  it('step 5: the permit only when uploads are on', () => {
    expect(validateStep(4, draft({ permitKey: null }), up)).toEqual({});
    expect(validateStep(4, draft({ permitKey: null }), { configured: true })).toEqual({
      permit: 'Add a photo or PDF of your business permit.',
    });
  });

  it('step 6: the accuracy checkbox', () => {
    expect(validateStep(5, draft({ accurate: false }), up)).toEqual({
      accurate: 'Tick the box to confirm your details are accurate.',
    });
    expect(validateStep(5, draft({ accurate: true }), up)).toEqual({});
  });
});

describe('hoursSummary', () => {
  it('groups consecutive days with the same hours, Monday first', () => {
    expect(hoursSummary(hoursFromApi(week))).toEqual([
      { days: 'Mon–Fri', hours: '08:00–18:00' },
      { days: 'Sat', hours: '09:00–15:00' },
      { days: 'Sun', hours: 'Closed' },
    ]);
  });
});

describe('patches', () => {
  it('details: trimmed fields, canonical phone', () => {
    expect(detailsPatch(draft({ name: ' Hub ', contactPhone: '0917-123-4567', description: ' Near the plaza ' }))).toEqual({
      name: 'Hub',
      contactPhone: '+639171234567',
      description: 'Near the plaza',
    });
  });

  it('location: address and coordinates', () => {
    expect(locationPatch(draft({ address: ' Tetuan ', lat: 6.91, lng: 122.07 }))).toEqual({
      address: 'Tetuan',
      lat: 6.91,
      lng: 122.07,
    });
  });

  it('hours: the API grid and the slot count', () => {
    expect(hoursPatch(draft({ expressSlots: '6' }))).toEqual({ hours: hoursToApi(draft().hours), expressSlotsPerDay: 6 });
  });
});

describe('servicePuts', () => {
  const rows = [row()];
  it('sends nothing when nothing changed', () => {
    expect(servicePuts(draft(), rows)).toEqual([]);
  });

  it('creates a newly enabled service and updates a changed rate', () => {
    const services = draft().services.map((s) =>
      s.code === 'DRY_CLEAN' ? { ...s, enabled: true, rate: '80', turnaround: '48' } : { ...s, rate: '27.50' },
    );
    expect(servicePuts(draft({ services }), rows)).toEqual([
      { serviceId: 'c-dc', body: { ratePhp: 80, turnaroundHours: 48, active: true } },
      { serviceId: 'c-wdf', body: { ratePhp: 27.5, turnaroundHours: 24, active: true } },
    ]);
  });

  it('turning a saved service off sends active false and keeps the saved rate', () => {
    const services = draft().services.map((s) => (s.code === 'WDF' ? { ...s, enabled: false, rate: '' } : s));
    expect(servicePuts(draft({ services }), rows)).toEqual([
      { serviceId: 'c-wdf', body: { ratePhp: 25, turnaroundHours: 24, active: false } },
    ]);
  });

  it('ignores a service that is off and was never saved', () => {
    const services = draft().services.map((s) => (s.code === 'DRY_CLEAN' ? { ...s, enabled: false, rate: '5' } : s));
    expect(servicePuts(draft({ services }), rows)).toEqual([]);
  });
});
