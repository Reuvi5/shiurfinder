// The map's web addresses, through the whole server (FR-5, FR-8, FR-9):
// bad input gets a 400, an unapproved shul a 404, and good requests the
// shapes the website expects.

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { startTestApp } from '../../../core/testing/test-app';

const prisma = new PrismaService();
const HERE = testPlace(2);
const data = new TestData(prisma, HERE);
let app: INestApplication;
let shulId: string;
let hiddenShulId: string;

beforeAll(async () => {
  app = await startTestApp();
  const shul = await data.shul({ name: 'API Shul' });
  const hidden = await data.shul({ name: 'API Hidden Shul', approved: false });
  shulId = shul.id;
  hiddenShulId = hidden.id;
  await data.shiur({ title: 'API Shiur', shulId, dates: [nyAt(2, '20:00')] });
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

function get(path: string) {
  return request(app.getHttpServer()).get(path);
}

describe('FR-5 GET /map/search', () => {
  it('returns pins and both tabs for a good search', async () => {
    const response = await get(`/map/search?lat=${HERE.lat}&lng=${HERE.lng}`).expect(200);
    expect(response.body).toMatchObject({ totalCount: 1, radiusMiles: 10, featured: [] });
    expect(response.body.pins).toEqual([expect.objectContaining({ name: 'API Shul' })]);
    expect(response.body.weekly).toEqual([expect.objectContaining({ title: 'API Shiur' })]);
  });

  it('rejects a latitude off the map with a 400 that says which field', async () => {
    const response = await get('/map/search?lat=91&lng=0').expect(400);
    expect(response.body).toEqual({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('lat'),
    });
  });

  it('rejects a search with no location', async () => {
    await get('/map/search').expect(400);
  });

  it('rejects afterTime later than beforeTime', async () => {
    const response = await get(
      `/map/search?lat=${HERE.lat}&lng=${HERE.lng}&afterTime=18:00&beforeTime=17:00`,
    ).expect(400);
    expect(response.body.message).toContain('beforeTime');
  });
});

describe('FR-8 GET /map/filters', () => {
  it('returns the three groups', async () => {
    const response = await get('/map/filters').expect(200);
    expect(response.body).toEqual({
      topics: expect.any(Array),
      languages: expect.any(Array),
      audiences: expect.any(Array),
    });
  });
});

describe('FR-9 GET /map/shul/:id/today', () => {
  it("returns an approved shul's card", async () => {
    const response = await get(`/map/shul/${shulId}/today`).expect(200);
    expect(response.body).toMatchObject({ publisherId: shulId, name: 'API Shul' });
  });

  it('is a 404 for an unapproved shul, the same as a missing one (NFR-4)', async () => {
    const hidden = await get(`/map/shul/${hiddenShulId}/today`).expect(404);
    const missing = await get('/map/shul/no-such-id/today').expect(404);
    expect(hidden.body).toEqual(missing.body);
    expect(hidden.body.code).toBe('SHUL_NOT_FOUND');
  });

  it('rejects a bad location', async () => {
    await get(`/map/shul/${shulId}/today?lat=abc`).expect(400);
  });
});
