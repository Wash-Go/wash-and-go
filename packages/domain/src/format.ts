// Deterministic peso formatting (no Intl — Hermes' Intl is partial). Lives in
// domain (pure, platform-free) so mobile (RN) and the web portals (Next) share
// one source; packages/ui re-exports it for the mobile apps.
export function peso(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n)) return '₱0.00';
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = n < 0 ? '-' : '';
  return `${sign}₱${withCommas}.${dec}`;
}
