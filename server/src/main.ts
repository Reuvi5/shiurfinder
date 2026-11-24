// Starts the server. This is the first file that runs.

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { setUpApp } from './app.setup';

async function start(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // The settings the API tests get too (CORS, login, error format).
  setUpApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server running at http://localhost:${port}`, 'Start');
}

void start();
