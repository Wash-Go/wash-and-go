import type { PendingInviteView } from '@wash-and-go/domain';
import {
  acceptOutcome,
  inviteEmailError,
  inviteErrorMessage,
  inviteHeadline,
  notAShopMode,
  shellInvite,
  shouldFetchPendingInvites,
} from './invites';

const invite = (id = 'i1'): PendingInviteView => ({
  id,
  shopName: 'Tetuan Laundry Hub',
  invitedByName: 'Lorna Reyes',
  createdAt: '2026-10-19T08:00:00Z',
});

describe('shouldFetchPendingInvites', () => {
  it('asks when a verified email is on file', () => {
    expect(shouldFetchPendingInvites({ devBypass: false, inviteEmailOnFile: true, emailVerified: false })).toBe(true);
  });
  it('falls back to emailVerified when the API predates inviteEmailOnFile', () => {
    expect(shouldFetchPendingInvites({ devBypass: false, inviteEmailOnFile: undefined, emailVerified: true })).toBe(true);
    expect(shouldFetchPendingInvites({ devBypass: false, inviteEmailOnFile: undefined, emailVerified: undefined })).toBe(false);
  });
  it('never asks with both flags false', () => {
    expect(shouldFetchPendingInvites({ devBypass: false, inviteEmailOnFile: false, emailVerified: false })).toBe(false);
  });
  it('under the dev stub, asks only when the API says an email is on file', () => {
    // A dev-route user created with an email (the invite e2e); the seeded stub has none.
    expect(shouldFetchPendingInvites({ devBypass: true, inviteEmailOnFile: true, emailVerified: false })).toBe(true);
    expect(shouldFetchPendingInvites({ devBypass: true, inviteEmailOnFile: false, emailVerified: true })).toBe(false);
    // An older API without the flag: never guess from emailVerified for the stub.
    expect(shouldFetchPendingInvites({ devBypass: true, inviteEmailOnFile: undefined, emailVerified: true })).toBe(false);
  });
});

describe('notAShopMode', () => {
  it('an invite replaces Register as the primary, whatever the flags say', () => {
    expect(notAShopMode({ emailVerified: false, invites: [invite()], dismissed: [] })).toEqual({
      invite: invite(),
      verifyFirst: false,
      primary: 'accept',
    });
  });
  it('an unverified account with no invite is told to verify first and can still register', () => {
    expect(notAShopMode({ emailVerified: false, invites: [], dismissed: [] })).toEqual({
      invite: null,
      verifyFirst: true,
      primary: 'register',
    });
  });
  it('a verified account with no invite just registers', () => {
    expect(notAShopMode({ emailVerified: true, invites: [], dismissed: [] })).toEqual({
      invite: null,
      verifyFirst: false,
      primary: 'register',
    });
  });
  it('"Not now" hides that invite and shows the next one', () => {
    expect(notAShopMode({ emailVerified: true, invites: [invite('a'), invite('b')], dismissed: ['a'] }).invite?.id).toBe('b');
    expect(notAShopMode({ emailVerified: true, invites: [invite('a')], dismissed: ['a'] }).primary).toBe('register');
  });
});

describe('shellInvite', () => {
  it('shows the first open, undismissed invite to someone already in the console', () => {
    expect(shellInvite({ invites: [invite('a'), invite('b')], dismissed: ['a'] })?.id).toBe('b');
    expect(shellInvite({ invites: [], dismissed: [] })).toBeNull();
  });
});

describe('inviteHeadline', () => {
  it('names who invited you and the shop', () => {
    expect(inviteHeadline(invite())).toBe('Lorna Reyes invited you to join Tetuan Laundry Hub');
    expect(inviteHeadline({ ...invite(), invitedByName: '' })).toBe('Tetuan Laundry Hub invited you to join their team');
  });
});

describe('acceptOutcome', () => {
  it('a 200 (first or repeat accept) or a 404 refreshes the boot', () => {
    expect(acceptOutcome(null)).toEqual({ kind: 'refresh' });
    expect(acceptOutcome({ status: 404 })).toEqual({ kind: 'refresh', note: 'That invite is no longer open.' });
  });
  it('a 409 explains the one-shop rule', () => {
    expect(acceptOutcome({ status: 409 })).toEqual({
      kind: 'conflict',
      message: 'This account already belongs to a shop. For now, one account can work at one shop.',
    });
  });
  it('anything else is a retryable error', () => {
    expect(acceptOutcome({ status: 500 }).kind).toBe('error');
    expect(acceptOutcome(new Error('offline')).kind).toBe('error');
  });
});

describe('invite form', () => {
  it('checks the email shape', () => {
    expect(inviteEmailError('')).toBe('Enter their email address.');
    expect(inviteEmailError('ana@')).toBe('Enter a full email address, like ana@gmail.com.');
    expect(inviteEmailError(' Ana@Example.ph ')).toBeNull();
  });
  it('maps API errors to human copy', () => {
    expect(inviteErrorMessage({ status: 409, message: 'x' })).toBe('Already a member or already invited.');
    expect(inviteErrorMessage({ status: 400, message: 'You have 20 open invites' })).toBe(
      'You can have up to 20 open invites. Revoke one first.',
    );
    expect(inviteErrorMessage({ status: 400, message: 'email must be an email' })).toBe('Check the email address.');
    expect(inviteErrorMessage(new Error('net'))).toBe('We couldn’t send the invite. Check your connection, then try again.');
  });
});
