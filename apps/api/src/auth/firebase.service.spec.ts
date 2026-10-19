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
    const svc = withDecoded({ uid: 'u', email: 'A@Example.com', email_verified: true });
    await expect(svc.verifyIdToken('t')).resolves.toEqual({
      firebaseUid: 'u',
      phone: undefined,
      email: 'A@Example.com',
      emailVerified: true,
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
});
