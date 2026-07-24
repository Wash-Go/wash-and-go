import { ConsoleLogger, LoggerService } from '@nestjs/common';

/*
 * Structured logging (Tier 1 observability). In production every log line is a
 * single-line JSON object (level, time, context, message, +stack for errors) so
 * a log aggregator can parse and index it. In dev/test it delegates to Nest's
 * pretty ConsoleLogger — human-readable locally, machine-readable in prod, no
 * extra dependency.
 *
 * Wired via app.useLogger() with bufferLogs, so boot logs and the exception
 * filter's error logs all flow through it.
 */
export class JsonLogger implements LoggerService {
  private readonly pretty = new ConsoleLogger();
  private readonly asJson = process.env.NODE_ENV === 'production';

  log(message: unknown, context?: string): void {
    this.write('info', message, undefined, context);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, undefined, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, undefined, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, undefined, context);
  }

  // Nest calls error(message, stack?, context?).
  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, stack, context);
  }

  private write(
    level: string,
    message: unknown,
    stack: string | undefined,
    context: string | undefined,
  ): void {
    if (!this.asJson) {
      switch (level) {
        case 'error':
          this.pretty.error(message as string, stack, context);
          break;
        case 'warn':
          this.pretty.warn(message as string, context);
          break;
        case 'debug':
          this.pretty.debug(message as string, context);
          break;
        case 'verbose':
          this.pretty.verbose(message as string, context);
          break;
        default:
          this.pretty.log(message as string, context);
      }
      return;
    }
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      context: context || undefined,
      message:
        typeof message === 'string' ? message : safeString(message),
      ...(stack ? { stack } : {}),
    });
    // Errors/warnings to stderr, everything else to stdout.
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    stream.write(line + '\n');
  }
}

function safeString(value: unknown): string {
  try {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  } catch {
    return String(value);
  }
}
