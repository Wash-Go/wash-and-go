import type { ShopCatalogItem, ShopServiceRow } from '@wash-and-go/domain';
import { serviceRowLine, serviceSaveError, servicesDirty, servicesFromServer, validateServices } from './services-page';

const catalog: ShopCatalogItem[] = [
  { id: 'c-dc', code: 'DRY_CLEAN', name: 'Dry Cleaning', billingUnit: 'PER_PIECE' },
  { id: 'c-wdf', code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG' },
];
const rows: ShopServiceRow[] = [
  { id: 'r1', serviceId: 'c-wdf', code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG', ratePhp: '25.00', turnaroundHours: 24, active: true },
];

describe('servicesFromServer', () => {
  it('lists every catalog item with the saved rate, on when active', () => {
    expect(servicesFromServer(catalog, rows)).toEqual([
      { serviceId: 'c-dc', code: 'DRY_CLEAN', name: 'Dry Cleaning', billingUnit: 'PER_PIECE', enabled: false, rate: '', turnaround: '24' },
      { serviceId: 'c-wdf', code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG', enabled: true, rate: '25.00', turnaround: '24' },
    ]);
  });
});

describe('servicesDirty', () => {
  it('is false for the loaded value and true once a rate differs', () => {
    const s = servicesFromServer(catalog, rows);
    expect(servicesDirty(s, rows)).toBe(false);
    expect(servicesDirty(s.map((x) => (x.code === 'WDF' ? { ...x, rate: '25' } : x)), rows)).toBe(false);
    expect(servicesDirty(s.map((x) => (x.code === 'WDF' ? { ...x, rate: '27.50' } : x)), rows)).toBe(true);
    expect(servicesDirty(s.map((x) => (x.code === 'DRY_CLEAN' ? { ...x, enabled: true, rate: '80' } : x)), rows)).toBe(true);
  });
});

describe('validateServices', () => {
  it('reuses the wizard rules: one service on, caps on rate and hours', () => {
    const s = servicesFromServer(catalog, rows);
    expect(validateServices(s)).toEqual({});
    expect(validateServices(s.map((x) => ({ ...x, enabled: false })))).toEqual({ services: 'Turn on at least one service.' });
    expect(validateServices(s.map((x) => (x.code === 'WDF' ? { ...x, rate: '100000', turnaround: '721' } : x)))).toEqual({
      'rate:c-wdf': 'Enter a rate up to ₱99,999.00, with at most 2 decimals.',
      'turnaround:c-wdf': 'Enter whole hours from 1 to 720.',
    });
  });
});

describe('serviceSaveError', () => {
  it('is human copy for each API answer', () => {
    expect(serviceSaveError({ status: 400 })).toBe('Check the rates: up to ₱99,999.00 with 2 decimals, and 1 to 720 hours.');
    expect(serviceSaveError({ status: 403 })).toBe('Only the owner can change rates.');
    expect(serviceSaveError({ status: 404 })).toBe('That service isn’t offered any more. Refresh, then try again.');
    expect(serviceSaveError({ status: 409 })).toBe('That rate changed somewhere else. Refresh, then try again.');
    expect(serviceSaveError(new Error('x'))).toBe('We couldn’t save your rates. Check your connection, then try again.');
  });
});

describe('serviceRowLine', () => {
  it('shows rate per unit and turnaround', () => {
    expect(serviceRowLine(rows[0])).toBe('₱25.00 / kg · 24 h');
    expect(serviceRowLine({ ...rows[0], billingUnit: 'FLAT', ratePhp: '150.00', turnaroundHours: 48 })).toBe('₱150.00 flat · 48 h');
  });
});
