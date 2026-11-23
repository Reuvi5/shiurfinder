// Starts the server. This is the first file that runs.

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { setUpApp } from './app.setup';

async function start(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // The settings the API tests get too (error format, ...).
  setUpApp(app);

  // The website runs on a different port (5173) than the server, so the
  // browser needs permission to call us. WEB_ORIGIN can list several, comma separated.
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true, // lets login cookies through, once we have accounts
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server running at http://localhost:${port}`, 'Start');
}

void start();
