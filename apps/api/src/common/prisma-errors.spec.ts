import { Prisma } from '@prisma/client';
import { isUniqueViolation } from './prisma-errors';

const p2002 = (target: string) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'x',
    meta: { target },
  });

describe('isUniqueViolation', () => {
  it('is true for a P2002 on the named field', () => {
    expect(isUniqueViolation(p2002('Order_idempotencyKey_key'), 'idempotencyKey')).toBe(true);
  });

  it('is false for a P2002 on a different field', () => {
    expect(isUniqueViolation(p2002('Order_code_key'), 'idempotencyKey')).toBe(false);
  });

  it('is false for non-P2002 errors and plain errors', () => {
    const other = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2025',
      clientVersion: 'x',
      meta: { target: 'idempotencyKey' },
    });
    expect(isUniqueViolation(other, 'idempotencyKey')).toBe(false);
    expect(isUniqueViolation(new Error('nope'), 'idempotencyKey')).toBe(false);
  });
});
