import { peso, type ShopServiceRow } from '@wash-and-go/domain';
import { servicePuts, servicesFromServer, validateServices } from './wizard';
import { unitSuffix, type ServiceDraft } from './wizard-services';

// Services & rates page (/services). Same form rows, rules and PUT bodies as
// wizard step 3; this adds the dirty check, error copy and the read-only line.
export { servicesFromServer, validateServices };

export function servicesDirty(services: ServiceDraft[], saved: ShopServiceRow[]): boolean {
  return servicePuts({ services }, saved).length > 0;
}

export function serviceSaveError(error: unknown): string {
  const s = (error as { status?: unknown } | null)?.status;
  if (s === 400) return 'Check the rates: up to ₱99,999.00 with 2 decimals, and 1 to 720 hours.';
  if (s === 403) return 'Only the owner can change rates.';
  if (s === 404) return 'That service isn’t offered any more. Refresh, then try again.';
  if (s === 409) return 'That rate changed somewhere else. Refresh, then try again.';
  return 'We couldn’t save your rates. Check your connection, then try again.';
}

// "₱25.00 / kg · 24 h"
export function serviceRowLine(r: ShopServiceRow): string {
  return `${peso(r.ratePhp)} ${unitSuffix(r.billingUnit)} · ${r.turnaroundHours} h`;
}
