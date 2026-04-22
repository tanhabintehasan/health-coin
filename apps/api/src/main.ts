import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Global safety net: ensure BigInt always serializes to string in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const insecure = ['your_jwt_secret_here', 'your_refresh_secret_here'];
    if (insecure.includes(process.env.JWT_SECRET!) || insecure.includes(process.env.JWT_REFRESH_SECRET!)) {
      console.error('FATAL: JWT secrets are still set to placeholder values in production');
      process.exit(1);
    }
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const rawOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [];
  const allowAll = rawOrigins.includes('*');

  if (!rawOrigins.length && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: CORS_ORIGINS is not set. No cross-origin requests will be allowed.');
  }

  app.enableCors({
    origin: allowAll ? true : rawOrigins,
    credentials: !allowAll,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret', 'x-requested-with'],
  });

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('HealthCoin Platform API')
    .setDescription('Multi-vendor e-commerce platform with coin reward system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 10000;
  await app.listen(process.env.PORT || 10000);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
