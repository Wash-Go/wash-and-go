// Deterministic peso formatting (no Intl — Hermes' Intl is partial). Shared by
// both apps; money arrives from the API as a decimal string.
export function peso(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n)) return '₱0.00';
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = n < 0 ? '-' : '';
  return `${sign}₱${withCommas}.${dec}`;
}
