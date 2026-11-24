// GET /health, through the whole server: checks the API tests' setup works.

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApp } from '../../../core/testing/test-app';

let app: INestApplication;

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(() => app.close());

describe('GET /health', () => {
  it('reports the database and PostGIS as up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', db: 'up', postgis: expect.any(String) });
  });
});
