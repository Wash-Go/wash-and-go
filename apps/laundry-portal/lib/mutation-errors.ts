import { READY_NEEDS_WEIGHT, WEIGH_RANGE_HINT } from './weigh';

// Human copy for a failed portal mutation (U0 T3). Never shows raw server text
// or URLs: known API messages that are already written for people map to their
// own copy; everything else maps by HTTP status. ApiError carries a status;
// anything without one never got a response (offline, DNS, CORS, token fetch).
// Pure logic, no React, so it runs under the node jest config.

export type PortalAction = 'weigh' | 'preview' | 'status';

const VERB: Record<PortalAction, string> = {
  weigh: 'save the weight',
  preview: 'get the new price',
  status: 'update the order',
};

// API message (substring — class-validator may join repeats) → portal copy.
const KNOWN: [apiText: string, copy: string][] = [
  ['Weigh this order before marking it ready', READY_NEEDS_WEIGHT],
  ['Enter a weight above 0 kg and no more than', WEIGH_RANGE_HINT],
  [
    'Order is not at the shop for weighing',
    "This order isn't at the shop anymore, so its weight can't change.",
  ],
];

function statusOf(error: unknown): number | undefined {
  const s = (error as { status?: unknown } | null | undefined)?.status;
  return typeof s === 'number' ? s : undefined;
}

export function mutationErrorMessage(action: PortalAction, error: unknown): string {
  const status = statusOf(error);
  if (status === undefined) {
    return `Couldn't ${VERB[action]}. Check your connection and try again.`;
  }
  const text = String((error as { message?: unknown }).message ?? '');
  const known = KNOWN.find(([apiText]) => text.includes(apiText));
  if (known && (status === 400 || status === 409)) return known[1];

  switch (status) {
    case 400:
      return action === 'status'
        ? `Couldn't ${VERB[action]}. Try again in a moment.`
        : 'Check the weight and try again.';
    case 401:
      return 'Your sign-in expired. Sign in again, then retry.';
    case 403:
      return "Your account can't change this order.";
    case 404:
      return 'This order no longer exists. The queue has been refreshed.';
    case 409:
      return action === 'status'
        ? 'This order has already moved on. The queue has been refreshed.'
        : "This order can't be weighed right now. The queue has been refreshed.";
    case 429:
      return 'Too many attempts — try again in a minute.';
    default:
      return `Couldn't ${VERB[action]}. Try again in a moment.`;
  }
}

// The order changed under us (moved on / gone): refetch the queue so the card
// shows its real state. A network blip or 5xx keeps the card as is for retry.
export function shouldRefreshQueue(error: unknown): boolean {
  const status = statusOf(error);
  return status === 404 || status === 409;
}
