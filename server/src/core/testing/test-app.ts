// Starts the whole server for an API test, on the test database.
//
//   const app = await startTestApp();
//   await request(app.getHttpServer()).get('/health').expect(200);
//   const { cookie } = await signUp(app, data);   // a signed-in user
//   await request(app.getHttpServer()).post('/...').set('Cookie', cookie);
//   await app.close();
//
// Only for `*.db.test.ts` files: the server needs a real database.

import 'reflect-metadata';
import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { setUpApp } from '../../app.setup';
import { type TestData, uniqueEmail } from './test-data';

/**
 * The same app main.ts starts, without listening on a port or logging.
 * A test can pass its own module that imports AppModule, to add a route.
 */
export async function startTestApp(rootModule: Type = AppModule): Promise<INestApplication> {
  const app = await NestFactory.create(rootModule, { logger: false });
  setUpApp(app);
  await app.init();
  return app;
}

/**
 * Signs up a new user through the real sign-up endpoint (FR-2). Returns their
 * id and the Cookie header to send as them. `data.cleanUp()` removes them.
 */
export async function signUp(
  app: INestApplication,
  data: TestData,
): Promise<{ userId: string; cookie: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-up/email')
    .send({ name: 'Test User', email: uniqueEmail(), password: 'long-password' })
    .expect(200);
  const userId: string = response.body.user.id;
  data.track({ userId });

  // "better-auth.session_token=abc; Path=/; HttpOnly" -> "better-auth.session_token=abc"
  const setCookies = response.headers['set-cookie'] as unknown as string[];
  const cookie = setCookies.map((setCookie) => setCookie.split(';')[0]).join('; ');
  return { userId, cookie };
}
