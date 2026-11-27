// Reporting through the whole server, on a real database (FR-16): a guest is
// sent away, a report marks the date reported and shows as unverified right
// away, and what is turned down, including unapproved publishers (NFR-4).

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { minutesFromNow, nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { signUp, startTestApp } from '../../../core/testing/test-app';

const prisma = new PrismaService();
const data = new TestData(prisma, testPlace(11));
let app: INestApplication;
let alice = '';
let bob = '';
let ids: Record<string, string> = {};

beforeAll(async () => {
  app = await startTestApp();
  ({ cookie: alice } = await signUp(app, data));
  ({ cookie: bob } = await signUp(app, data));

  const shul = await data.shul({ name: 'Reports Shul' });
  const hiddenShul = await data.shul({ name: 'Reports Hidden Shul', approved: false });
  const hiddenRav = await data.maggidShiur({ name: 'Reports Hidden Rav', approved: false });

  const { occurrenceIds: open } = await data.shiur({
    title: 'Reports Daf Yomi',
    shulId: shul.id,
    durationMinutes: 60,
    dates: [nyAt(2, '20:00'), nyAt(3, '20:00')],
  });
  const { occurrenceIds: special } = await data.shiur({
    title: 'Reports Specials',
    shulId: shul.id,
    durationMinutes: 60,
    dates: [
      { startsAt: nyAt(4, '20:00'), status: 'CANCELLED' },
      { startsAt: nyAt(5, '20:00'), status: 'CHANGED' },
      minutesFromNow(-61), // a 60-minute shiur that ended a minute ago
      minutesFromNow(-59), // one with a minute left
    ],
  });
  const { occurrenceIds: hidden } = await data.shiur({
    title: 'Reports Hidden',
    shulId: hiddenShul.id,
    dates: [nyAt(2, '20:00')],
  });
  const { occurrenceIds: hiddenRavOnly } = await data.shiur({
    title: 'Reports Hidden Rav Only',
    maggidShiurId: hiddenRav.id,
    dates: [nyAt(2, '20:00')],
  });

  ids = {
    open: open[0],
    second: open[1],
    cancelled: special[0],
    changed: special[1],
    ended: special[2],
    endingSoon: special[3],
    hidden: hidden[0],
    hiddenRavOnly: hiddenRavOnly[0],
  };
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

function send(occurrenceId: string, body: object, cookie?: string) {
  const req = request(app.getHttpServer()).post(`/reports/${occurrenceId}`).send(body);
  return cookie ? req.set('Cookie', cookie) : req;
}

async function statusOf(occurrenceId: string) {
  const row = await prisma.occurrence.findUniqueOrThrow({ where: { id: occurrenceId } });
  return row.status;
}

describe('FR-16 reporting a date', () => {
  it('turns a guest away and saves nothing (FR-1)', async () => {
    const response = await send(ids.open, { reason: 'SHUL_CLOSED' }).expect(401);

    expect(response.body.code).toBe('NOT_SIGNED_IN');
    expect(await prisma.report.count({ where: { occurrenceId: ids.open } })).toBe(0);
    expect(await statusOf(ids.open)).toBe('ON');
  });

  it('marks the date reported and everyone sees the unverified report right away', async () => {
    const response = await send(ids.open, { reason: 'SHUL_CLOSED' }, alice).expect(201);

    expect(response.body).toEqual({
      occurrenceId: ids.open,
      reports: [{ reason: 'Shul closed', reportedAt: expect.any(String) }],
    });
    expect(await statusOf(ids.open)).toBe('REPORTED');

    // A guest sees it on the shiur page and in the report list.
    const page = await request(app.getHttpServer()).get(`/shiur-page/${ids.open}`).expect(200);
    expect(page.body.status).toBe('REPORTED');
    const list = await request(app.getHttpServer()).get(`/reports/${ids.open}`).expect(200);
    expect(list.body.reports.map((r: { reason: string }) => r.reason)).toEqual(['Shul closed']);
  });

  it('only reports that one date, not the rest of the weekly shiur', async () => {
    expect(await statusOf(ids.second)).toBe('ON');
  });

  it('turns down a second report from the same person', async () => {
    const response = await send(ids.open, { reason: 'OTHER', details: 'Again' }, alice).expect(409);

    expect(response.body.code).toBe('ALREADY_REPORTED');
    expect(await prisma.report.count({ where: { occurrenceId: ids.open } })).toBe(1);
  });

  it('takes a report from someone else, with a write-in, newest first', async () => {
    const response = await send(
      ids.open,
      { reason: 'OTHER', details: 'Moved to the social hall' },
      bob,
    ).expect(201);

    expect(response.body.reports.map((r: { reason: string }) => r.reason)).toEqual([
      'Other: Moved to the social hall',
      'Shul closed',
    ]);
  });

  it('keeps a changed date’s status, but still lists the report', async () => {
    const response = await send(ids.changed, { reason: 'SHUL_CLOSED' }, alice).expect(201);

    expect(response.body.reports).toHaveLength(1);
    expect(await statusOf(ids.changed)).toBe('CHANGED');
  });

  it('turns down a date that is already cancelled', async () => {
    const response = await send(ids.cancelled, { reason: 'SHUL_CLOSED' }, alice).expect(400);

    expect(response.body.code).toBe('ALREADY_CANCELLED');
  });

  it('takes a report with a minute left, but not a minute after the end', async () => {
    await send(ids.endingSoon, { reason: 'MAGGID_SHIUR_UNAVAILABLE' }, alice).expect(201);

    const response = await send(ids.ended, { reason: 'SHUL_CLOSED' }, alice).expect(400);
    expect(response.body.code).toBe('REPORT_TOO_LATE');
    expect(await statusOf(ids.ended)).toBe('ON');
  });

  it('turns down bad input', async () => {
    await send(ids.second, { reason: 'SWITCHED_TIME' }, alice).expect(400);
    const response = await send(ids.second, { reason: 'OTHER' }, alice).expect(400);

    expect(response.body.code).toBe('INVALID_REQUEST');
    expect(await statusOf(ids.second)).toBe('ON');
  });

  it('gives 404 for a date that does not exist', async () => {
    await send('no-such-date', { reason: 'SHUL_CLOSED' }, alice).expect(404);
    await request(app.getHttpServer()).get('/reports/no-such-date').expect(404);
  });
});

describe('NFR-4 unapproved publishers', () => {
  it('hides a date at an unapproved shul: same 404, nothing saved', async () => {
    const response = await send(ids.hidden, { reason: 'SHUL_CLOSED' }, alice).expect(404);

    expect(response.body.code).toBe('SHIUR_NOT_FOUND');
    await request(app.getHttpServer()).get(`/reports/${ids.hidden}`).expect(404);
    expect(await prisma.report.count({ where: { occurrenceId: ids.hidden } })).toBe(0);
  });

  it('hides a date given only by an unapproved maggid shiur', async () => {
    await send(ids.hiddenRavOnly, { reason: 'SHUL_CLOSED' }, alice).expect(404);
  });
});
