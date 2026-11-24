// GET /publishers/:id through the whole server (FR-10): a shul's page, a
// maggid shiur's page, and a 404 for an unapproved one (NFR-4).

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { startTestApp } from '../../../core/testing/test-app';

const prisma = new PrismaService();
const data = new TestData(prisma, testPlace(6));
let app: INestApplication;
let shulId: string;
let ravId: string;
let hiddenId: string;

beforeAll(async () => {
  app = await startTestApp();
  shulId = (await data.shul({ name: 'API Publisher Shul' })).id;
  ravId = (await data.maggidShiur({ name: 'API Rabbi' })).id;
  hiddenId = (await data.shul({ name: 'API Hidden Publisher', approved: false })).id;
  await data.shiur({
    title: 'API Page Shiur',
    shulId,
    maggidShiurId: ravId,
    dates: [nyAt(1, '20:00')],
  });
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

function get(path: string) {
  return request(app.getHttpServer()).get(path);
}

describe('FR-10 GET /publishers/:id', () => {
  it("returns a shul's page", async () => {
    const response = await get(`/publishers/${shulId}`).expect(200);
    expect(response.body).toMatchObject({ type: 'SHUL', name: 'API Publisher Shul' });
    expect(response.body.weekly).toEqual([
      expect.objectContaining({
        title: 'API Page Shiur',
        maggidShiur: { id: ravId, name: 'API Rabbi' },
      }),
    ]);
  });

  it("returns a maggid shiur's page with the shuls they teach at", async () => {
    const response = await get(`/publishers/${ravId}`).expect(200);
    expect(response.body).toMatchObject({
      type: 'MAGGID_SHIUR',
      name: 'API Rabbi',
      shuls: [{ id: shulId, name: 'API Publisher Shul' }],
    });
  });

  it('is a 404 for an unapproved publisher, the same as a missing one (NFR-4)', async () => {
    const hidden = await get(`/publishers/${hiddenId}`).expect(404);
    const missing = await get('/publishers/no-such-id').expect(404);
    expect(hidden.body).toEqual(missing.body);
    expect(hidden.body.code).toBe('PUBLISHER_NOT_FOUND');
  });
});
