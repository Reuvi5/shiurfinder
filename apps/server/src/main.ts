import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // One place decides the error shape for the whole server (SDD, Errors).
  app.useGlobalFilters(new AllExceptionsFilter());

  // The website is served from a different origin in development.
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true, // Better Auth's session cookie travels on these
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  Logger.log(`ShiurFinder server listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
