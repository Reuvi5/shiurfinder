// Login through the whole server on a real database (FR-1, FR-2): Better
// Auth's tables in schema.prisma, the login cookie, and SignedInGuard on a
// route. The logic itself is tested in auth.service.test.ts.

import { Controller, Get, type INestApplication, Module, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { webOrigins } from '../../config/web-origins';
import { PrismaService } from '../../database/prisma.service';
import { startTestApp, signUp } from '../../testing/test-app';
import { TestData, testPlace, uniqueEmail } from '../../testing/test-data';
import type { SignedInUser } from '../auth.service';
import { CurrentUser } from '../current-user.decorator';
import { SignedInGuard } from '../signed-in.guard';

/** A route only for signed-in users, like a feature's would be. */
@Controller('test-who-am-i')
class WhoAmIController {
  @Get()
  @UseGuards(SignedInGuard)
  whoAmI(@CurrentUser() user: SignedInUser): SignedInUser {
    return user;
  }
}

@Module({ imports: [AppModule], controllers: [WhoAmIController] })
class TestModule {}

/** Where our website runs in tests. Browsers send it as Origin on every login request. */
const WEBSITE = webOrigins()[0];

const prisma = new PrismaService();
const data = new TestData(prisma, testPlace(9));
let app: INestApplication;

beforeAll(async () => {
  app = await startTestApp(TestModule);
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

describe('FR-2 sign up and sign in', () => {
  it('signs up, and the cookie works on a route that needs an account', async () => {
    const { userId, cookie } = await signUp(app, data);

    const response = await request(app.getHttpServer())
      .get('/test-who-am-i')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({ id: userId, isModerator: false });
  });

  it('stores a hash, never the password itself', async () => {
    const { userId } = await signUp(app, data);

    const login = await prisma.account.findFirstOrThrow({ where: { userId } });

    expect(login.providerId).toBe('credential');
    expect(login.password).toBeTruthy();
    expect(login.password).not.toContain('long-password');
  });

  it('signs in again with the same email and password', async () => {
    const email = uniqueEmail();
    const up = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({ name: 'Test User', email, password: 'long-password' })
      .expect(200);
    data.track({ userId: up.body.user.id });

    const right = await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .send({ email, password: 'long-password' });
    const wrong = await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .send({ email, password: 'wrong-password' });

    expect(right.status).toBe(200);
    expect(right.headers['set-cookie']).toBeDefined();
    expect(wrong.status).toBe(401);
  });

  it('refuses a second account with the same email', async () => {
    const email = uniqueEmail();
    const first = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({ name: 'Test User', email, password: 'long-password' })
      .expect(200);
    data.track({ userId: first.body.user.id });

    const second = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({ name: 'Someone Else', email, password: 'other-password' });

    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
});

describe('FR-1 routes that need an account', () => {
  it('refuses a guest with NOT_SIGNED_IN', async () => {
    const response = await request(app.getHttpServer()).get('/test-who-am-i').expect(401);

    expect(response.body.code).toBe('NOT_SIGNED_IN');
  });

  it('refuses someone who signed out', async () => {
    const { cookie } = await signUp(app, data);

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('Origin', WEBSITE)
      .set('Cookie', cookie)
      .expect(200);

    await request(app.getHttpServer()).get('/test-who-am-i').set('Cookie', cookie).expect(401);
  });

  it("doesn't let another website use the login cookie", async () => {
    const { cookie } = await signUp(app, data);

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('Origin', 'https://some-other-site.example')
      .set('Cookie', cookie)
      .expect(403);

    // Still signed in: the other site's sign-out didn't happen.
    await request(app.getHttpServer()).get('/test-who-am-i').set('Cookie', cookie).expect(200);
  });
});
