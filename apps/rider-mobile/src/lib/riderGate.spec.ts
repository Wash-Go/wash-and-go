import { ApiError } from '@wash-and-go/api-client';
import {
  accessErrorMessage,
  gateCopy,
  loadRiderAccess,
  riderGate,
  type RiderAccessApi,
} from './riderGate';

const profile = (status: string, rejectionReason: string | null = null) => ({
  status,
  rejectionReason,
});

describe('riderGate', () => {
  it('lets a RIDER with a VERIFIED profile in', () => {
    expect(riderGate(['RIDER'], profile('VERIFIED'))).toBe('ok');
  });

  it('lets a multi-role RIDER with a VERIFIED profile in', () => {
    expect(riderGate(['CUSTOMER', 'RIDER'], profile('VERIFIED'))).toBe('ok');
  });

  it('turns away an account without the RIDER role, even with a VERIFIED profile', () => {
    expect(riderGate(['CUSTOMER'], null)).toBe('not-rider');
    expect(riderGate(['ADMIN'], null)).toBe('not-rider');
    expect(riderGate(['CUSTOMER'], profile('VERIFIED'))).toBe('not-rider');
  });

  it('treats missing roles as not a rider', () => {
    expect(riderGate([], profile('VERIFIED'))).toBe('not-rider');
    expect(riderGate(null, profile('VERIFIED'))).toBe('not-rider');
    expect(riderGate(undefined, profile('VERIFIED'))).toBe('not-rider');
  });

  it('holds a SUBMITTED rider as pending review', () => {
    expect(riderGate(['RIDER'], profile('SUBMITTED'))).toBe('pending');
  });

  it('holds a REJECTED rider as rejected', () => {
    expect(riderGate(['RIDER'], profile('REJECTED', 'Blurry license'))).toBe('rejected');
  });

  it('holds a DRAFT rider, or a RIDER with no profile at all, as not submitted', () => {
    expect(riderGate(['RIDER'], profile('DRAFT'))).toBe('not-submitted');
    expect(riderGate(['RIDER'], null)).toBe('not-submitted');
    expect(riderGate(['RIDER'], undefined)).toBe('not-submitted');
  });

  it('fails closed on a status it does not know', () => {
    expect(riderGate(['RIDER'], profile('SUSPENDED'))).toBe('not-submitted');
  });
});

function fakeApi(
  roles: string[],
  rider: { status: string; rejectionReason: string | null } | null,
): RiderAccessApi & { getMe: jest.Mock; getMyRiderOnboarding: jest.Mock } {
  return {
    getMe: jest.fn().mockResolvedValue({ id: 'u1', roles }),
    getMyRiderOnboarding: jest.fn().mockResolvedValue(rider),
  };
}

describe('loadRiderAccess', () => {
  it('reads the roles from GET /auth/me and the status from GET /rider/onboarding', async () => {
    const api = fakeApi(['RIDER'], profile('VERIFIED'));
    await expect(loadRiderAccess(api)).resolves.toEqual({ gate: 'ok', reason: null });
    expect(api.getMe).toHaveBeenCalledTimes(1);
    expect(api.getMyRiderOnboarding).toHaveBeenCalledTimes(1);
  });

  it('lets the seeded dev stub rider (dev-rider-1, VERIFIED) straight in', async () => {
    const api = fakeApi(['RIDER'], {
      status: 'VERIFIED',
      rejectionReason: null,
    });
    expect((await loadRiderAccess(api)).gate).toBe('ok');
  });

  it('turns a customer away (their orders are not jobs)', async () => {
    const api = fakeApi(['CUSTOMER'], null);
    await expect(loadRiderAccess(api)).resolves.toEqual({ gate: 'not-rider', reason: null });
  });

  it('carries the rejection reason, trimmed, for a rejected rider', async () => {
    const api = fakeApi(['RIDER'], profile('REJECTED', '  License photo is blurry  '));
    await expect(loadRiderAccess(api)).resolves.toEqual({
      gate: 'rejected',
      reason: 'License photo is blurry',
    });
  });

  it('drops a blank rejection reason', async () => {
    const api = fakeApi(['RIDER'], profile('REJECTED', '   '));
    await expect(loadRiderAccess(api)).resolves.toEqual({ gate: 'rejected', reason: null });
  });

  it('ignores a leftover reason on a rider who is no longer rejected', async () => {
    const api = fakeApi(['RIDER'], profile('SUBMITTED', 'Old reason'));
    await expect(loadRiderAccess(api)).resolves.toEqual({ gate: 'pending', reason: null });
  });

  it('rejects when either call fails, so the app fails closed instead of letting the user in', async () => {
    const meDown = fakeApi(['RIDER'], profile('VERIFIED'));
    meDown.getMe.mockRejectedValue(new ApiError(500, 'boom'));
    await expect(loadRiderAccess(meDown)).rejects.toBeInstanceOf(ApiError);

    const onboardingDown = fakeApi(['RIDER'], profile('VERIFIED'));
    onboardingDown.getMyRiderOnboarding.mockRejectedValue(new TypeError('Network request failed'));
    await expect(loadRiderAccess(onboardingDown)).rejects.toBeInstanceOf(TypeError);
  });
});

describe('gateCopy', () => {
  it('tells a non-rider the app is for riders and offers no refresh', () => {
    const c = gateCopy('not-rider', null);
    expect(c.title).toBe('This app is for Wash & Go riders');
    expect(c.refresh).toBe(false);
  });

  it('explains a pending review and that jobs appear after approval', () => {
    const c = gateCopy('pending', null);
    expect(c.title).toMatch(/review/i);
    expect(c.body).toMatch(/jobs .*after .*approv/i);
    expect(c.refresh).toBe(true);
  });

  it('explains an unsubmitted application and that jobs appear after approval', () => {
    const c = gateCopy('not-submitted', null);
    expect(c.body).toMatch(/jobs .*after .*approv/i);
    expect(c.refresh).toBe(true);
  });

  it('shows the rejection reason when the API gave one', () => {
    const c = gateCopy('rejected', 'License photo is blurry');
    expect(c.body).toContain('License photo is blurry');
    expect(c.body).toMatch(/jobs .*after .*approv/i);
    expect(c.refresh).toBe(true);
  });

  it('reads cleanly without a rejection reason', () => {
    const c = gateCopy('rejected', null);
    expect(c.body).not.toMatch(/null|undefined|Reason:/);
    expect(c.body).toMatch(/jobs .*after .*approv/i);
  });
});

describe('accessErrorMessage', () => {
  it('says the server is unreachable when there was no HTTP response', () => {
    expect(accessErrorMessage(new TypeError('Network request failed'))).toMatch(/can't reach/i);
  });

  it('asks the user to sign in again on 401/403', () => {
    expect(accessErrorMessage(new ApiError(401, 'User not found'))).toMatch(/sign in again/i);
    expect(accessErrorMessage(new ApiError(403, 'Forbidden'))).toMatch(/sign in again/i);
  });

  it('falls back to a generic retry message on other statuses', () => {
    expect(accessErrorMessage(new ApiError(500, 'boom'))).toMatch(/try again/i);
  });
});
