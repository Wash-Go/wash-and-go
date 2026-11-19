import { readFileSync } from 'fs';
import { join } from 'path';
import { DEV_PROTECTED_UIDS } from './dev-protected-uids';

// DEV_PROTECTED_UIDS mirrors every firebaseUid prisma/seed.ts creates (the
// seed defines them inline, so they are read here as text). A seed user added
// without updating the denylist fails this spec.
describe('DEV_PROTECTED_UIDS parity with prisma/seed.ts', () => {
  const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8');
  const seeded = [...seed.matchAll(/firebaseUid:\s*'([^']+)'/g)].map((m) => m[1]);

  it('lists exactly the seeded uids', () => {
    expect(seeded.length).toBeGreaterThan(0);
    expect([...new Set(seeded)].sort()).toEqual([...DEV_PROTECTED_UIDS].sort());
  });

  it('includes the dev admin bootstrap caller', () => {
    expect(DEV_PROTECTED_UIDS).toContain('dev-admin');
  });
});
