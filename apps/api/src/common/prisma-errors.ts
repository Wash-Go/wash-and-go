import { Prisma } from '@prisma/client';

// True when `e` is a Prisma unique-constraint violation (P2002) on a column/index
// whose name contains `field`. Used to turn a concurrent idempotency-key race
// into "return the row the other request created" instead of a 500.
export function isUniqueViolation(e: unknown, field: string): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === 'P2002' &&
    String((e.meta as { target?: unknown } | undefined)?.target ?? '').includes(
      field,
    )
  );
}

// Any unique-constraint violation (P2002), whatever the index.
export function isP2002(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}
