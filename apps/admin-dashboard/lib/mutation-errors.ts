// Human copy for a failed admin mutation (U0 T8; mirrors the portal's T3
// helper). Never shows raw server text or URLs: API messages already written for
// people map to admin copy, everything else maps by HTTP status. ApiError carries
// a status; anything without one never got a response (offline, DNS, CORS,
// token fetch). Pure logic, no React, so it runs under the node jest config.

export type AdminAction =
  | 'cancel-order'
  | 'assign-rider'
  | 'close-week'
  | 'mark-paid'
  | 'record-deposit'
  | 'toggle-zone'
  | 'create-shop'
  | 'update-shop'
  | 'add-service'
  | 'update-service'
  | 'add-staff'
  | 'remove-staff'
  | 'update-user';

const VERB: Record<AdminAction, string> = {
  'cancel-order': 'cancel the order',
  'assign-rider': 'assign the rider',
  'close-week': 'close the week',
  'mark-paid': 'mark the batch paid',
  'record-deposit': 'record the deposit',
  'toggle-zone': 'update the zone',
  'create-shop': 'create the shop',
  'update-shop': 'update the shop',
  'add-service': 'add the service',
  'update-service': 'update the service',
  'add-staff': 'add the staff member',
  'remove-staff': 'remove the staff member',
  'update-user': 'update the user',
};

const ORDER_ACTIONS: ReadonlySet<AdminAction> = new Set(['cancel-order', 'assign-rider']);

// API message (substring) → admin copy. Only trusted on a 400/409.
const KNOWN: [apiText: string, copy: string][] = [
  ['Rider is not verified yet', "This rider isn't verified yet, so they can't take jobs."],
  ['cash limit', 'This rider is over the cash limit. Record their deposit on Rider cash first.'],
  ['Assignee is not a rider', "That account isn't a rider."],
  ['User is not a rider', "That account isn't a rider."],
  [
    'closed concurrently',
    'Someone else closed this week at the same moment. The batches have been refreshed.',
  ],
  ['Deposit amount must be a positive number', 'Enter a deposit amount above ₱0.'],
];

function statusOf(error: unknown): number | undefined {
  const s = (error as { status?: unknown } | null | undefined)?.status;
  return typeof s === 'number' ? s : undefined;
}

export function mutationErrorMessage(action: AdminAction, error: unknown): string {
  const verb = VERB[action];
  const status = statusOf(error);
  if (status === undefined) {
    return `Couldn't ${verb}. Check your connection and try again.`;
  }
  const text = String((error as { message?: unknown }).message ?? '');
  const known = KNOWN.find(([apiText]) => text.includes(apiText));
  if (known && (status === 400 || status === 409)) return known[1];

  switch (status) {
    case 400:
      return `Couldn't ${verb}. Check the values and try again.`;
    case 401:
      return 'Your sign-in expired. Sign in again, then retry.';
    case 403:
      return "Your account isn't allowed to do this.";
    case 404:
      return `Couldn't ${verb}. It no longer exists.`;
    case 409:
      return ORDER_ACTIONS.has(action)
        ? 'This order has already moved on. The board updates every few seconds.'
        : `Couldn't ${verb}. It changed in the meantime — check the latest and try again.`;
    case 429:
      return 'Too many attempts — try again in a minute.';
    default:
      return `Couldn't ${verb}. Try again in a moment.`;
  }
}

// The record changed under us (gone / moved on): refetch so the row shows its
// real state. A network blip or 5xx keeps what's on screen for a retry.
export function shouldRefresh(error: unknown): boolean {
  const status = statusOf(error);
  return status === 404 || status === 409;
}
