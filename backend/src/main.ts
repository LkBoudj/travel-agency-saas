import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AUTH_COOKIE_NAME } from './auth/auth.constants.js';
import { configureApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config = app.get(ConfigService);

  const configuredOrigins = config
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const devOrigins =
    config.get<string>('NODE_ENV') === 'production'
      ? undefined
      : [
        // frontend/agency-dashboard-mantine
          'http://localhost:5175',
          'http://127.0.0.1:5175',
          // frontend/dashboard
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          // frontend/admin
          'http://localhost:5174',
          'http://127.0.0.1:5174',
        ];
  app.enableCors({
    origin: configuredOrigins ?? devOrigins ?? false,
    credentials: true,
  });

  // Swagger publishes every route, parameter and error code. That is a map for
  // an attacker, so it is a development aid only and never served in production.
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Travel SaaS API')
      .setDescription('Travel SaaS backend API contract')
      .setVersion('0.0.1')
      .addCookieAuth(AUTH_COOKIE_NAME)
      .addTag('auth')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
