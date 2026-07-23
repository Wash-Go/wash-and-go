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
  );

  const isProd = process.env.NODE_ENV === 'production';

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
  app.enableCors({
    origin: origins.length > 0 ? origins : !isProd,
    credentials: true,
    // Fastify's default preflight omits PATCH/DELETE, so browser PATCH (zone
    // toggle, address edit) + DELETE were CORS-blocked. Allow them explicitly.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
