import { CACHE_OWNER_KEY, cacheOwnerDecision, sessionUid } from './cache-owner';

describe('sessionUid', () => {
  it('namespaces Firebase and dev-stub identities', () => {
    expect(sessionUid({ uid: 'abc' }, undefined)).toBe('fb:abc');
    expect(sessionUid(null, 'dev-shop-owner')).toBe('dev:dev-shop-owner');
    // A real sign-in wins over the stub, as it does on the API.
    expect(sessionUid({ uid: 'abc' }, 'dev-shop-owner')).toBe('fb:abc');
    expect(sessionUid(null, undefined)).toBeNull();
  });
});

describe('cacheOwnerDecision', () => {
  it('keeps the cache for the same owner', () => {
    expect(cacheOwnerDecision('fb:abc', 'fb:abc')).toEqual({ purge: false, record: 'fb:abc' });
  });

  it('purges when another account signs in', () => {
    expect(cacheOwnerDecision('fb:abc', 'fb:xyz')).toEqual({ purge: true, record: 'fb:xyz' });
  });

  it('purges when no owner is recorded (after sign-out, first run, cleared storage)', () => {
    // A late response from the last session can land after sign-out cleared
    // the owner; with no owner on record nothing in the cache is trusted.
    expect(cacheOwnerDecision(null, 'fb:abc')).toEqual({ purge: true, record: 'fb:abc' });
  });

  it('uses a stable storage key', () => {
    expect(CACHE_OWNER_KEY).toBe('wg-portal-cache-owner');
  });
});
