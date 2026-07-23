import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import helmet from '@fastify/helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    // Skip Nest's default json body parser so our empty-body-tolerant parser
    // below is the only one registered (avoids a duplicate-parser boot error).
    { bodyParser: false },
  );

  const isProd = process.env.NODE_ENV === 'production';

  // Treat an EMPTY application/json body as "no body" instead of letting
  // Fastify's built-in parser 500 with "Body cannot be empty". This runs before
  // Nest's pipeline (which can't rescue it), so it closes the empty-body class at
  // the source — no-body POST/DELETE (pay-cash, delete-address) work regardless
  // of whether the caller sends a content-type header.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req: unknown, body: string, done: (err: Error | null, value?: unknown) => void) => {
      try {
        done(null, body === '' ? undefined : JSON.parse(body));
      } catch (err) {
        done(err as Error);
      }
    },
  );

  // A7: security headers.
  await app.register(helmet);

  // A11: strip AND reject unknown fields; no implicit coercion beyond the DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // A3: global exception filter (Prisma mapping + sanitized 5xx).
  app.useGlobalFilters(new AllExceptionsFilter());

  // A4: CORS allow-list from CORS_ORIGINS (comma-separated). In dev, if unset,
  // reflect the request origin for convenience; in prod, unset = no cross-origin.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // A credentialed response must never echo `*`. If CORS_ORIGINS is misconfigured
  // to `*`, fall back to dev-reflect / prod-off instead of the invalid combo.
  const originOption =
    origins.length > 0 && !origins.includes('*') ? origins : !isProd;
  app.enableCors({
    origin: originOption,
    credentials: true,
    // Fastify's default preflight omits PATCH/DELETE, so browser PATCH (zone
    // toggle, address edit) + DELETE were CORS-blocked. List methods explicitly.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Pin the header allow-list. Without this @fastify/cors reflects requested
    // headers (works today), but declaring intent stops a future lockdown from
    // silently re-breaking the custom-header (x-dev-uid) + auth flows.
    allowedHeaders: [
      'authorization',
      'content-type',
      'x-dev-uid',
      'idempotency-key',
    ],
  });

  // A8: Swagger only outside production.
  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle('Wash & Go API')
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api-docs',
      app,
      SwaggerModule.createDocument(app, swagger),
    );
  }

  // A9: drain connections + fire onModuleDestroy (Prisma $disconnect) on SIGTERM.
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
