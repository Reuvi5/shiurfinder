// Account settings through the whole server, on a real database (FR-4): the
// settings a user sees and changes, that guests are refused and nobody
// touches another user's account, and that deleting removes all their
// personal data.

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { signUp, startTestApp } from '../../../core/testing/test-app';
import { nyAt, TestData, testPlace } from '../../../core/testing/test-data';

const prisma = new PrismaService();
const data = new TestData(prisma, testPlace(10));
let app: INestApplication;
let gemara: string;
let halacha: string;

beforeAll(async () => {
  app = await startTestApp();
  gemara = (await data.topic('Account Gemara')).id;
  halacha = (await data.topic('Account Halacha')).id;
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

const server = () => app.getHttpServer();

describe('FR-4 account settings', () => {
  it('shows a new account its settings: the defaults, and its name and email', async () => {
    const { cookie } = await signUp(app, data);

    const response = await request(server()).get('/account').set('Cookie', cookie).expect(200);

    expect(response.body).toMatchObject({
      name: 'Test User',
      email: expect.stringContaining('@'),
      darkMode: false,
      alerts: { newShiur: true, changed: true, cancelled: true, reminders: true },
      topicIds: [],
    });
    expect(response.body.topicChoices).toEqual(
      expect.arrayContaining([
        { id: gemara, name: 'Account Gemara' },
        { id: halacha, name: 'Account Halacha' },
      ]),
    );
  });

  it('saves changes and returns them, leaving the rest as they were', async () => {
    const { cookie } = await signUp(app, data);

    const response = await request(server())
      .patch('/account')
      .set('Cookie', cookie)
      .send({ name: ' Dovid ', darkMode: true, alerts: { reminders: false }, topicIds: [gemara] })
      .expect(200);
    const again = await request(server()).get('/account').set('Cookie', cookie).expect(200);

    expect(response.body).toMatchObject({
      name: 'Dovid',
      darkMode: true,
      alerts: { newShiur: true, changed: true, cancelled: true, reminders: false },
      topicIds: [gemara],
    });
    expect(again.body).toEqual(response.body);
  });

  it('replaces the topics with the new list, and an empty list unpicks them all', async () => {
    const { cookie } = await signUp(app, data);
    const change = (topicIds: string[]) =>
      request(server()).patch('/account').set('Cookie', cookie).send({ topicIds }).expect(200);

    await change([gemara]);
    const swapped = await change([halacha]);
    const none = await change([]);

    expect(swapped.body.topicIds).toEqual([halacha]);
    expect(none.body.topicIds).toEqual([]);
  });

  it("refuses a topic that doesn't exist, and changes nothing", async () => {
    const { cookie } = await signUp(app, data);

    const response = await request(server())
      .patch('/account')
      .set('Cookie', cookie)
      .send({ darkMode: true, topicIds: [gemara, 'no-such-topic'] })
      .expect(400);
    const after = await request(server()).get('/account').set('Cookie', cookie).expect(200);

    expect(response.body.code).toBe('INVALID_REQUEST');
    expect(after.body).toMatchObject({ darkMode: false, topicIds: [] });
  });

  it("refuses fields users can't change", async () => {
    const { userId, cookie } = await signUp(app, data);

    await request(server())
      .patch('/account')
      .set('Cookie', cookie)
      .send({ isModerator: true })
      .expect(400);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.isModerator).toBe(false);
  });
});

describe('FR-4 who can see and change an account', () => {
  it('refuses a guest on every route', async () => {
    for (const send of [
      request(server()).get('/account'),
      request(server()).patch('/account').send({ darkMode: true }),
      request(server()).delete('/account'),
    ]) {
      const response = await send.expect(401);
      expect(response.body.code).toBe('NOT_SIGNED_IN');
    }
  });

  it("only ever changes the signed-in user's own account", async () => {
    const me = await signUp(app, data);
    const someoneElse = await signUp(app, data);

    await request(server())
      .patch('/account')
      .set('Cookie', me.cookie)
      .send({ name: 'Changed', darkMode: true, topicIds: [gemara] })
      .expect(200);
    const theirs = await request(server())
      .get('/account')
      .set('Cookie', someoneElse.cookie)
      .expect(200);

    expect(theirs.body).toMatchObject({ name: 'Test User', darkMode: false, topicIds: [] });
  });
});

describe('FR-4 deleting the account', () => {
  it('removes all their personal data, and signs them out', async () => {
    const { userId, cookie } = await signUp(app, data);
    // Something of theirs in every table that points at a user.
    const shul = await data.shul({ name: 'Account Shul' });
    const { shiur, occurrenceIds } = await data.shiur({
      title: 'Account Shiur',
      shulId: shul.id,
      dates: [nyAt(1, '20:00')],
    });
    await prisma.userTopic.create({ data: { userId, topicId: gemara } });
    await prisma.savedShiur.create({ data: { userId, shiurId: shiur.id } });
    await prisma.follow.create({ data: { userId, publisherId: shul.id } });
    await prisma.teamMember.create({ data: { userId, publisherId: shul.id } });
    await prisma.report.create({ data: { occurrenceId: occurrenceIds[0], reportedById: userId } });
    await prisma.sentAlert.create({ data: { userId, kind: 'reminder' } });
    await prisma.pushSubscription.create({
      data: { userId, endpoint: `https://push.example/${userId}`, p256dh: 'k', auth: 'a' },
    });
    await prisma.verification.create({
      data: {
        id: `reset-${userId}`,
        identifier: `reset-password:${userId}-token`,
        value: userId,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const change = await prisma.changeHistory.create({
      data: { shiurId: shiur.id, changedById: userId, summary: 'created' },
    });

    await request(server()).delete('/account').set('Cookie', cookie).expect(204);

    const where = { userId };
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
    expect(await prisma.session.count({ where })).toBe(0);
    expect(await prisma.account.count({ where })).toBe(0);
    expect(await prisma.userTopic.count({ where })).toBe(0);
    expect(await prisma.savedShiur.count({ where })).toBe(0);
    expect(await prisma.follow.count({ where })).toBe(0);
    expect(await prisma.teamMember.count({ where })).toBe(0);
    expect(await prisma.report.count({ where: { reportedById: userId } })).toBe(0);
    expect(await prisma.sentAlert.count({ where })).toBe(0);
    expect(await prisma.pushSubscription.count({ where })).toBe(0);
    expect(await prisma.verification.count({ where: { value: userId } })).toBe(0);
    // The shiur's history stays, without who made the change.
    expect(
      (await prisma.changeHistory.findUniqueOrThrow({ where: { id: change.id } })).changedById,
    ).toBeNull();
    // The old login no longer works.
    await request(server()).get('/account').set('Cookie', cookie).expect(401);
  });

  it("doesn't touch anyone else's account", async () => {
    const me = await signUp(app, data);
    const someoneElse = await signUp(app, data);

    await request(server()).delete('/account').set('Cookie', me.cookie).expect(204);

    await request(server()).get('/account').set('Cookie', someoneElse.cookie).expect(200);
  });

  it("can't use the email's old password once deleted", async () => {
    const { userId, cookie } = await signUp(app, data);
    const { email } = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await request(server()).delete('/account').set('Cookie', cookie).expect(204);
    const signIn = await request(server())
      .post('/auth/sign-in/email')
      .send({ email, password: 'long-password' });

    expect(signIn.status).toBe(401);
  });
});
