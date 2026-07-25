import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

// The one global error boundary. What matters: Prisma codes map to the right
// HTTP status, and a 5xx NEVER leaks the underlying error/stack to the client.
function run(exception: unknown) {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    send(body: unknown) {
      sent.body = body;
      return this;
    },
  };
  const req = { id: 'req-1', method: 'POST', url: '/x' };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  };
  new AllExceptionsFilter().catch(exception, host as never);
  return sent as { status: number; body: Record<string, unknown> };
}

const P = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: '6' });

describe('AllExceptionsFilter', () => {
  it('passes an HttpException through with its status + message', () => {
    const out = run(new NotFoundException('no user'));
    expect(out.status).toBe(404);
    expect(out.body.message).toBe('no user');
  });

  it('flattens a validation message array to a string', () => {
    const out = run(new BadRequestException(['a required', 'b required']));
    expect(out.status).toBe(400);
    expect(out.body.message).toBe('a required, b required');
  });

  it('maps known Prisma codes to the right status', () => {
    expect(run(P('P2002')).status).toBe(HttpStatus.CONFLICT);
    expect(run(P('P2025')).status).toBe(HttpStatus.NOT_FOUND);
    expect(run(P('P2003')).status).toBe(HttpStatus.CONFLICT);
  });

  it('sanitizes an unknown error to a generic 500 — no stack/message leak', () => {
    const out = run(new Error('secret db connection string in here'));
    expect(out.status).toBe(500);
    expect(out.body.message).toBe('Internal server error');
    // the real error text must not appear anywhere in the client body
    expect(JSON.stringify(out.body)).not.toContain('secret');
    expect(out.body.requestId).toBe('req-1');
  });

  it('an unmapped Prisma code is a sanitized 500, not a leak', () => {
    const out = run(P('P2010'));
    expect(out.status).toBe(500);
    expect(out.body.message).toBe('Internal server error');
  });
});
