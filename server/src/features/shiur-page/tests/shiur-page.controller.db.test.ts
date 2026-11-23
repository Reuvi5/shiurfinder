// GET /shiur-page/:id through the whole server (FR-9): the details, a 404
// for an unapproved shiur (NFR-4), and a 400 for a bad location.

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { startTestApp } from '../../../core/testing/test-app';

const prisma = new PrismaService();
const data = new TestData(prisma, testPlace(4));
let app: INestApplication;
let shownId: string;
let hiddenId: string;

beforeAll(async () => {
  app = await startTestApp();
  const shul = await data.shul({ name: 'API Page Shul' });
  const hiddenShul = await data.shul({ name: 'API Page Hidden Shul', approved: false });
  shownId = (await data.shiur({ title: 'Shown', shulId: shul.id, dates: [nyAt(2, '20:00')] }))
    .occurrenceIds[0];
  hiddenId = (
    await data.shiur({ title: 'Hidden', shulId: hiddenShul.id, dates: [nyAt(2, '20:00')] })
  ).occurrenceIds[0];
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

function get(path: string) {
  return request(app.getHttpServer()).get(path);
}

describe('FR-9 GET /shiur-page/:id', () => {
  it('returns the details, with a Hebrew date', async () => {
    const response = await get(`/shiur-page/${shownId}`).expect(200);
    expect(response.body).toMatchObject({
      occurrenceId: shownId,
      title: 'Shown',
      shul: { name: 'API Page Shul' },
      hebrewDate: expect.any(String),
    });
  });

  it('is a 404 for an unapproved shiur, the same as a missing one (NFR-4)', async () => {
    const hidden = await get(`/shiur-page/${hiddenId}`).expect(404);
    const missing = await get('/shiur-page/no-such-id').expect(404);
    expect(hidden.body).toEqual(missing.body);
    expect(hidden.body.code).toBe('SHIUR_NOT_FOUND');
  });

  it('rejects a bad location with a 400', async () => {
    const response = await get(`/shiur-page/${shownId}?lat=abc`).expect(400);
    expect(response.body.code).toBe('INVALID_REQUEST');
  });
});
