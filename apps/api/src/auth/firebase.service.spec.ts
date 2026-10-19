import type { ConfigService } from '@nestjs/config';
import { FirebaseService } from './firebase.service';

// verifyIdToken is the ONLY source of the email that accepts staff invites,
// so its mapping of email / email_verified is pinned here.
function withDecoded(decoded: Record<string, unknown>) {
  const svc = new FirebaseService({ get: () => undefined } as unknown as ConfigService);
  (svc as unknown as { app: unknown }).app = {
    auth: () => ({ verifyIdToken: async () => decoded }),
  };
  return svc;
}

describe('FirebaseService.verifyIdToken identity mapping', () => {
  it('carries email + email_verified from the verified token', async () => {
    const svc = withDecoded({
      uid: 'u',
      email: 'A@Example.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    await expect(svc.verifyIdToken('t')).resolves.toEqual({
      firebaseUid: 'u',
      phone: undefined,
      email: 'A@Example.com',
      emailVerified: true,
      signInProvider: 'google.com',
    });
  });

  it.each([false, undefined, 'true', 1])('email_verified %p → emailVerified false', async (v) => {
    const svc = withDecoded({ uid: 'u', email: 'a@example.com', email_verified: v });
    expect((await svc.verifyIdToken('t')).emailVerified).toBe(false);
  });

  it('phone-auth tokens carry no email', async () => {
    const svc = withDecoded({ uid: 'u', phone_number: '+639171234567' });
    const id = await svc.verifyIdToken('t');
    expect(id.email).toBeUndefined();
    expect(id.emailVerified).toBe(false);
  });

  it.each(['password', 'emailLink', 'phone', 'custom'])('exposes sign_in_provider %p', async (p) => {
    const svc = withDecoded({ uid: 'u', firebase: { sign_in_provider: p } });
    expect((await svc.verifyIdToken('t')).signInProvider).toBe(p);
  });

  it('a token without a firebase claim or a non-string provider → signInProvider undefined', async () => {
    expect((await withDecoded({ uid: 'u' }).verifyIdToken('t')).signInProvider).toBeUndefined();
    const odd = withDecoded({ uid: 'u', firebase: { sign_in_provider: 42 } });
    expect((await odd.verifyIdToken('t')).signInProvider).toBeUndefined();
  });
});
