// Starts the whole server for an API test, on the test database.
//
//   const app = await startTestApp();
//   await request(app.getHttpServer()).get('/health').expect(200);
//   await app.close();
//
// Only for `*.db.test.ts` files: the server needs a real database.

import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { setUpApp } from '../../app.setup';

/** The same app main.ts starts, without listening on a port or logging. */
export async function startTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  setUpApp(app);
  await app.init();
  return app;
}
