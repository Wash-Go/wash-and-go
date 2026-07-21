import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

/*
 * A3 (P1): one global filter so nothing leaks a raw stack trace or an unmapped
 * 500. HttpExceptions pass through with their status; known Prisma errors map to
 * the right 4xx (P2002 → 409, P2025 → 404, P2003 → 409); anything else is a
 * sanitized 500 that logs the real error server-side with the request id for
 * correlation but returns only a generic body to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const reqId = req?.id ?? '-';

    const { status, message } = this.resolve(exception);

    if (status >= 500) {
      // Full detail server-side only.
      this.logger.error(
        `[${reqId}] ${req?.method} ${req?.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${reqId}] ${req?.method} ${req?.url} → ${status} ${message}`);
    }

    res.status(status).send({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message: status >= 500 ? 'Internal server error' : message,
      requestId: reqId,
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      const message =
        typeof resp === 'string'
          ? resp
          : ((resp as { message?: string | string[] }).message ?? exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND, message: 'Resource not found' };
        case 'P2003':
          return { status: HttpStatus.CONFLICT, message: 'Related resource constraint' };
        default:
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: 'Invalid query' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
