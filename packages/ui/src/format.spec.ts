import { peso } from './format';

describe('peso', () => {
  it('formats whole-peso strings', () => {
    expect(peso('150')).toBe('₱150.00');
    expect(peso('222.00')).toBe('₱222.00');
  });
  it('adds thousands separators + 2 decimals', () => {
    expect(peso('1234.5')).toBe('₱1,234.50');
    expect(peso(1000000)).toBe('₱1,000,000.00');
  });
  it('handles zero + non-finite input', () => {
    expect(peso('0')).toBe('₱0.00');
    expect(peso('nope')).toBe('₱0.00');
  });
});
