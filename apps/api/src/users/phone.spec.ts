import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import {
  PLACEHOLDER_PHONE_PREFIX,
  isPlaceholderPhone,
  normalizePhMobile,
  placeholderPhone,
  visiblePhone,
} from './phone';

const ACCEPTED: [string, string][] = [
  ['09171234567', '+639171234567'],
  ['9171234567', '+639171234567'],
  ['+639171234567', '+639171234567'],
  ['639171234567', '+639171234567'],
  ['0917 123 4567', '+639171234567'],
  ['0917-123-4567', '+639171234567'],
  ['+63 917 123 4567', '+639171234567'],
  ['  09171234567  ', '+639171234567'],
];

const REJECTED = [
  '',
  '0917123456',
  '091712345678',
  '08171234567',
  '+6309171234567',
  '+1 917 123 4567',
  '0063 917 123 4567',
  '(0917) 123 4567',
  '0917.123.4567',
  'pending:abc123',
];

describe('normalizePhMobile (API mirror)', () => {
  it.each(ACCEPTED)('accepts %p as %p', (raw, e164) => {
    expect(normalizePhMobile(raw)).toBe(e164);
  });

  it.each(REJECTED)('rejects %p', (raw) => {
    expect(normalizePhMobile(raw)).toBeNull();
  });
});

describe('placeholder phones', () => {
  it('builds and recognizes pending:<uid>', () => {
    expect(placeholderPhone('fb-1')).toBe('pending:fb-1');
    expect(isPlaceholderPhone('pending:fb-1')).toBe(true);
    expect(isPlaceholderPhone('+639171234567')).toBe(false);
  });

  it('visiblePhone masks the placeholder to null for every other party', () => {
    expect(visiblePhone('pending:fb-1')).toBeNull();
    expect(visiblePhone('+639171234567')).toBe('+639171234567');
  });
});

/*
 * Parity with @wash-and-go/domain/src/phone.ts (the copy the apps validate
 * with). The API may not value-import the domain package, so transpile the
 * domain file's source and run it in a sandbox, then feed both copies the same
 * inputs. A drift in either rule fails here instead of letting the app accept a
 * number the API refuses (or the reverse).
 */
function loadDomainPhone(): {
  normalizePhMobile: (raw: string) => string | null;
  isPlaceholderPhone: (phone: string) => boolean;
  PLACEHOLDER_PHONE_PREFIX: string;
} {
  const src = readFileSync(
    join(__dirname, '../../../../packages/domain/src/phone.ts'),
    'utf8',
  );
  const js = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(js, { module: mod, exports: mod.exports });
  return mod.exports as ReturnType<typeof loadDomainPhone>;
}

describe('phone rule parity: API mirror vs domain', () => {
  const domain = loadDomainPhone();
  const inputs = [
    ...ACCEPTED.map(([raw]) => raw),
    ...REJECTED,
    '0999-999 9999',
    '+63 9 1 7 1 2 3 4 5 6 7',
    '63 917 123 45678',
    '9',
    '+63',
  ];

  it.each(inputs)('normalizes %p identically', (raw) => {
    expect(normalizePhMobile(raw)).toBe(domain.normalizePhMobile(raw));
  });

  it('agrees on the placeholder prefix', () => {
    expect(PLACEHOLDER_PHONE_PREFIX).toBe(domain.PLACEHOLDER_PHONE_PREFIX);
    expect(isPlaceholderPhone('pending:x')).toBe(domain.isPlaceholderPhone('pending:x'));
  });
});
