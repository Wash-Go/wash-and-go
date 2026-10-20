import {
  ensureFirebaseAccounts,
  generatePassword,
  lookupOwnerAccount,
  type FirebaseAuthLike,
} from './demo-firebase';

function fakeAuth(existing: Record<string, string>) {
  const users = new Map(Object.entries(existing)); // email → uid
  let seq = 0;
  const auth = {
    getUserByEmail: jest.fn(async (email: string) => {
      const uid = users.get(email);
      if (!uid) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
      return { uid };
    }),
    createUser: jest.fn(async (p: { email: string }) => {
      const uid = `fb-${++seq}`;
      users.set(p.email, uid);
      return { uid };
    }),
    updateUser: jest.fn(async (uid: string) => ({ uid })),
  };
  return auth as typeof auth & FirebaseAuthLike;
}

describe('ensureFirebaseAccounts', () => {
  it('creates missing accounts with the password and emailVerified: true', async () => {
    const auth = fakeAuth({});
    const out = await ensureFirebaseAccounts(auth, [{ email: 'a@x.ph', displayName: 'Demo A' }], {
      password: 'pw-1',
      resetPasswords: false,
    });
    expect(out).toEqual({ uids: { 'a@x.ph': 'fb-1' }, created: ['a@x.ph'] });
    expect(auth.createUser).toHaveBeenCalledWith({
      email: 'a@x.ph',
      password: 'pw-1',
      emailVerified: true,
      displayName: 'Demo A',
    });
  });

  it('existing accounts: marks the email verified but leaves the password alone by default', async () => {
    const auth = fakeAuth({ 'ceo@x.ph': 'real-uid' });
    const out = await ensureFirebaseAccounts(auth, [{ email: 'ceo@x.ph' }], {
      password: 'pw-1',
      resetPasswords: false,
    });
    expect(out).toEqual({ uids: { 'ceo@x.ph': 'real-uid' }, created: [] });
    expect(auth.updateUser).toHaveBeenCalledWith('real-uid', { emailVerified: true });
    expect(auth.createUser).not.toHaveBeenCalled();
  });

  it('existing accounts get the password only with resetPasswords', async () => {
    const auth = fakeAuth({ 'staff@x.ph': 'u-s' });
    await ensureFirebaseAccounts(auth, [{ email: 'staff@x.ph' }], {
      password: 'pw-2',
      resetPasswords: true,
    });
    expect(auth.updateUser).toHaveBeenCalledWith('u-s', { emailVerified: true, password: 'pw-2' });
  });

  it('rethrows anything other than user-not-found', async () => {
    const auth = fakeAuth({});
    auth.getUserByEmail.mockRejectedValueOnce(
      Object.assign(new Error('quota'), { code: 'auth/quota' }),
    );
    await expect(
      ensureFirebaseAccounts(auth, [{ email: 'a@x.ph' }], { password: 'p', resetPasswords: false }),
    ).rejects.toThrow('quota');
  });
});

// The owner default is the CEO's real address: the scripts only LOOK it up.
describe('lookupOwnerAccount (read-only)', () => {
  it('returns the existing uid and never creates or updates anything', async () => {
    const auth = fakeAuth({ 'ceo@x.ph': 'real-uid' });
    await expect(lookupOwnerAccount(auth, 'ceo@x.ph')).resolves.toBe('real-uid');
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('returns null when the owner has no account yet (no create)', async () => {
    const auth = fakeAuth({});
    await expect(lookupOwnerAccount(auth, 'ceo@x.ph')).resolves.toBeNull();
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('rethrows other Firebase errors', async () => {
    const auth = fakeAuth({});
    auth.getUserByEmail.mockRejectedValueOnce(
      Object.assign(new Error('quota'), { code: 'auth/quota' }),
    );
    await expect(lookupOwnerAccount(auth, 'ceo@x.ph')).rejects.toThrow('quota');
  });
});

describe('generatePassword', () => {
  it('is long, random and URL-safe', () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
