import { ApiError } from '@wash-and-go/api-client';
import { ensureSession, sessionAfterSignIn, sessionErrorMessage } from './session';

const session = { id: 'user-1', roles: ['CUSTOMER'] };
const firebaseUser = { uid: 'fb-uid-1' };

describe('ensureSession', () => {
  it('calls POST /auth/session once for a signed-in Firebase user and returns the session', async () => {
    const postSession = jest.fn().mockResolvedValue(session);
    const res = await ensureSession(firebaseUser, { postSession });
    expect(postSession).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ ok: true, session });
  });

  it('does not call postSession without a Firebase user (dev x-dev-uid stub path)', async () => {
    const postSession = jest.fn();
    expect(await ensureSession(null, { postSession })).toEqual({ ok: true, session: null });
    expect(await ensureSession(undefined, { postSession })).toEqual({ ok: true, session: null });
    expect(postSession).not.toHaveBeenCalled();
  });

  it('never throws: a failed call comes back as a human message plus the raw error', async () => {
    const err = new ApiError(500, 'Internal server error');
    const postSession = jest.fn().mockRejectedValue(err);
    const res = await ensureSession(firebaseUser, { postSession });
    expect(res).toEqual({ ok: false, message: sessionErrorMessage(err), error: err });
  });
});

describe('sessionAfterSignIn (login path)', () => {
  it('opens the session and leaves Firebase signed in on success', async () => {
    const postSession = jest.fn().mockResolvedValue(session);
    const signOut = jest.fn().mockResolvedValue(undefined);
    const res = await sessionAfterSignIn(firebaseUser, { postSession }, signOut);
    expect(res).toEqual({ ok: true, session });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs back out of Firebase when the DB user cannot be created, and returns the message', async () => {
    const postSession = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const signOut = jest.fn().mockResolvedValue(undefined);
    const res = await sessionAfterSignIn(firebaseUser, { postSession }, signOut);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/reach the Wash & Go server/);
  });

  it('still reports the session failure if signing out also fails', async () => {
    const postSession = jest.fn().mockRejectedValue(new ApiError(401, 'Invalid token'));
    const signOut = jest.fn().mockRejectedValue(new Error('signOut failed'));
    const res = await sessionAfterSignIn(firebaseUser, { postSession }, signOut);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/couldn't verify your sign-in/);
  });

  it('does nothing without a Firebase user', async () => {
    const postSession = jest.fn();
    const signOut = jest.fn();
    expect(await sessionAfterSignIn(null, { postSession }, signOut)).toEqual({
      ok: true,
      session: null,
    });
    expect(postSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('sessionErrorMessage', () => {
  it('maps a network failure (no HTTP status) to a connection message', () => {
    expect(sessionErrorMessage(new TypeError('Failed to fetch'))).toBe(
      "Can't reach the Wash & Go server. Check your connection and try again.",
    );
  });

  it('maps 401/403 to a re-sign-in message', () => {
    const msg = "We couldn't verify your sign-in. Please sign in again.";
    expect(sessionErrorMessage(new ApiError(401, 'Invalid token'))).toBe(msg);
    expect(sessionErrorMessage(new ApiError(403, 'Forbidden'))).toBe(msg);
  });

  it('maps 429 (the endpoint is throttled) to a wait message', () => {
    expect(sessionErrorMessage(new ApiError(429, 'ThrottlerException'))).toBe(
      'Too many attempts — try again in a minute.',
    );
  });

  it('maps any other HTTP failure to a generic message without leaking server text', () => {
    const msg = sessionErrorMessage(new ApiError(500, 'Firebase not initialized'));
    expect(msg).toBe("Signed in, but we couldn't set up your account. Try again in a moment.");
    expect(msg).not.toMatch(/Firebase not initialized|HTTP/);
  });
});
