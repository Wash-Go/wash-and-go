import { EXPRESS_TIMELINE, MAX_WEIGH_KG, type OrderStatus } from '@wash-and-go/domain';

// Help page copy (plan A4 "Help"). Pure, so the facts it states (statuses,
// the weigh cap and threshold) are checked against the domain in jest.

const STEP_TEXT: Record<OrderStatus, string> = {
  BOOKED: 'A customer booked laundry and your shop was matched. Nothing to do yet.',
  ASSIGNED: 'A rider is on the way to collect the bag from the customer.',
  PICKED_UP: 'The rider has the bag and is bringing it to your shop.',
  AT_SHOP: 'The bag is with you. Weigh it, then mark it washing.',
  PROCESSING: 'Washing. When it is folded and bagged, mark it ready for pickup.',
  READY_FOR_RETURN: 'Waiting for the rider to collect it from your shop.',
  OUT_FOR_RETURN: 'The rider is taking it back to the customer.',
  DELIVERED: 'Delivered. Its payout joins your next batch.',
  CANCELLED: 'Cancelled by the customer or by ops. Nothing more to do.',
};

const SHOP_ACTS: OrderStatus[] = ['AT_SHOP', 'PROCESSING'];

export const ORDER_STEPS: { status: OrderStatus; text: string; shopActs: boolean }[] = [
  ...EXPRESS_TIMELINE,
  'CANCELLED' as const,
].map((status) => ({ status, text: STEP_TEXT[status], shopActs: SHOP_ACTS.includes(status) }));

export const WEIGH_RULES: string[] = [
  `Weigh every bag on your scale and enter the kilograms. The most one order can weigh is ${MAX_WEIGH_KG} kg.`,
  'The price updates as you type, and the button shows the total the customer will pay.',
  'If the weight is more than double the estimate or more than 5 kg over it, you confirm it a second time. Check the scale, not a slipped decimal.',
  'You can weigh again while the order is still at the shop or washing. After it is ready for pickup the weight is final.',
  'The customer is told the new total when you confirm.',
];

export const PAYOUT_RULES: string[] = [
  'Each delivered order earns your shop its wash value minus the Wash & Go commission. The order detail shows your payout.',
  'Delivered orders wait under "Pending" until ops closes the period; then they move into a batch.',
  'Ops sends each batch to your payout account. The transfer reference appears on the batch once it is sent.',
  'Add or change your payout account on the Shop page (owners only).',
];

export function appVersionLine(version: string, build: string): string {
  return build ? `Version ${version} · build ${build.slice(0, 7)}` : `Version ${version}`;
}

export function emailStatusLine(s: {
  devBypass: boolean;
  email: string | null;
  emailVerified: boolean | undefined;
}): string {
  if (s.devBypass && !s.email) return 'Signed in with the developer stub, so there is no email to verify.';
  if (!s.email) return 'No sign-in email on this account.';
  return s.emailVerified ? `${s.email} is verified.` : `${s.email} is not verified yet. Check your inbox for the link.`;
}
