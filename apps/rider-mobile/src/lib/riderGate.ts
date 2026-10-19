// Who may use the rider app (U0 T5). Only an account with the RIDER role AND a
// VERIFIED rider profile gets the job board and the Cash tab — the same rule the
// API uses to make a rider dispatchable (riders.service: riderProfile VERIFIED).
// Everyone else gets a screen that says why, instead of a customer's own orders
// listed as "jobs" and a Cash tab that 403s.
//
// Pure logic, no firebase/React imports, so it runs under the node jest config.
// The dev x-dev-uid stub goes through the same check: the seeded dev riders are
// VERIFIED, and pointing EXPO_PUBLIC_DEV_UID at dev-customer / dev-pending-rider
// shows the gate screens in a browser.

export type RiderGate = 'ok' | 'not-rider' | 'not-submitted' | 'pending' | 'rejected';

export function riderGate(
  roles: readonly string[] | null | undefined,
  rider: { status: string } | null | undefined,
): RiderGate {
  if (!roles?.includes('RIDER')) return 'not-rider';
  switch (rider?.status) {
    case 'VERIFIED':
      return 'ok';
    case 'SUBMITTED':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    // DRAFT, no profile at all (RIDER role granted without onboarding), or a
    // status this build doesn't know: not approved, so not in.
    default:
      return 'not-submitted';
  }
}

export type RiderAccess = { gate: RiderGate; reason: string | null };

export interface RiderAccessApi {
  getMe(): Promise<{ roles: readonly string[] }>;
  getMyRiderOnboarding(): Promise<{ status: string; rejectionReason: string | null } | null>;
}

// GET /auth/me (roles) and GET /rider/onboarding (status + rejection reason; null
// when the account never started onboarding), in parallel. Any failure rejects —
// the caller shows an error with a retry and never lets the user in on a guess.
export async function loadRiderAccess(api: RiderAccessApi): Promise<RiderAccess> {
  const [me, rider] = await Promise.all([api.getMe(), api.getMyRiderOnboarding()]);
  const gate = riderGate(me.roles, rider);
  const reason = gate === 'rejected' ? rider?.rejectionReason?.trim() || null : null;
  return { gate, reason };
}

export type GateCopy = { title: string; body: string; refresh: boolean };

const AFTER_APPROVAL = 'Your jobs will appear here after you’re approved.';

// Plain-words copy for each closed gate. `refresh` = offer a "Check again"
// button (a status can change while the app is open); a non-rider only gets
// Sign out.
export function gateCopy(gate: Exclude<RiderGate, 'ok'>, reason: string | null): GateCopy {
  switch (gate) {
    case 'not-rider':
      return {
        title: 'This app is for Wash & Go riders',
        body: 'This account isn’t a rider account. To book laundry, use the Wash & Go app instead.',
        refresh: false,
      };
    case 'pending':
      return {
        title: 'Your application is under review',
        body: `Wash & Go is checking your documents. ${AFTER_APPROVAL}`,
        refresh: true,
      };
    case 'rejected':
      return {
        title: 'Your application wasn’t approved',
        body: reason
          ? `Reason: ${reason}\nContact Wash & Go ops to fix it and apply again. ${AFTER_APPROVAL}`
          : `Contact Wash & Go ops to find out why and what to fix. ${AFTER_APPROVAL}`,
        refresh: true,
      };
    case 'not-submitted':
      return {
        title: 'Your rider account isn’t verified yet',
        body: `Your rider application hasn’t been sent for review. Contact Wash & Go ops to finish it. ${AFTER_APPROVAL}`,
        refresh: true,
      };
  }
}

// Human copy for a failed access check. ApiError carries an HTTP status;
// anything without one never got a response (offline, DNS, CORS, token fetch).
export function accessErrorMessage(error: unknown): string {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status !== 'number') {
    return "Can't reach the Wash & Go server. Check your connection and try again.";
  }
  if (status === 401 || status === 403) {
    return "We couldn't verify your sign-in. Please sign out and sign in again.";
  }
  return "Couldn't check your rider account. Try again in a moment.";
}
