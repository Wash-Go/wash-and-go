import { parseRate, priceExample, rateError, turnaroundError, unitLabel, unitSuffix } from './wizard-services';

const svc = (code: string, name: string, rate: string, enabled = true, billingUnit = 'PER_KG' as const) => ({
  serviceId: code,
  code,
  name,
  billingUnit,
  enabled,
  rate,
  turnaround: '24',
});

describe('unit labels', () => {
  it('names each billing unit', () => {
    expect(unitLabel('PER_KG')).toBe('per kg');
    expect(unitLabel('PER_PIECE')).toBe('per piece');
    expect(unitLabel('FLAT')).toBe('flat');
    expect(unitSuffix('PER_KG')).toBe('/ kg');
    expect(unitSuffix('PER_PIECE')).toBe('/ piece');
    expect(unitSuffix('FLAT')).toBe('flat');
  });
});

describe('rates', () => {
  it('parses pesos with up to 2 decimals, tolerating ₱ and commas', () => {
    expect(parseRate('25')).toBe(25);
    expect(parseRate('₱1,250.50')).toBe(1250.5);
    expect(parseRate(' 25.5 ')).toBe(25.5);
    expect(parseRate('25.555')).toBeNull();
    expect(parseRate('abc')).toBeNull();
    expect(parseRate('')).toBeNull();
    expect(parseRate('1e3')).toBeNull();
  });

  it('accepts 0 < rate <= 99999', () => {
    expect(rateError('25')).toBeNull();
    expect(rateError('99999')).toBeNull();
    expect(rateError('99999.01')).not.toBeNull();
    expect(rateError('0')).not.toBeNull();
    expect(rateError('')).toBe('Enter your rate.');
  });

  it('accepts whole turnaround hours 1..720', () => {
    expect(turnaroundError('24')).toBeNull();
    expect(turnaroundError('720')).toBeNull();
    expect(turnaroundError('0')).not.toBeNull();
    expect(turnaroundError('721')).not.toBeNull();
    expect(turnaroundError('1.5')).not.toBeNull();
    expect(turnaroundError('')).not.toBeNull();
  });
});

describe('priceExample', () => {
  it('shows 6 kg of wash, dry & fold at the WDF rate', () => {
    expect(priceExample([svc('WDF', 'Wash, Dry & Fold', '25')])).toBe('6 kg wash, dry & fold = ₱150.00');
  });

  it('is null when wash, dry & fold is off or has no valid rate', () => {
    expect(priceExample([svc('WDF', 'Wash, Dry & Fold', '25', false)])).toBeNull();
    expect(priceExample([svc('WDF', 'Wash, Dry & Fold', 'x')])).toBeNull();
    expect(priceExample([svc('DRY_CLEAN', 'Dry Cleaning', '80', true, 'PER_PIECE' as never)])).toBeNull();
  });

  it('rounds to centavos', () => {
    expect(priceExample([svc('WDF', 'Wash, Dry & Fold', '24.99')])).toBe('6 kg wash, dry & fold = ₱149.94');
  });
});
