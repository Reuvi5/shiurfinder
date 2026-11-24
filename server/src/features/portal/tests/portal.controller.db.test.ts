// Posting a shiur through the whole server, on a real database (FR-20): the
// dates it makes in New York time, that it shows up on the map right away,
// new names typed into the form, and what is turned down (NFR-4).

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { milesEast, nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { startTestApp } from '../../../core/testing/test-app';
import { PortalQueries } from '../portal.queries';

const prisma = new PrismaService();
const queries = new PortalQueries(prisma);
const HERE = testPlace(7);
const data = new TestData(prisma, HERE);
let app: INestApplication;
let ids: Record<string, string> = {};

beforeAll(async () => {
  app = await startTestApp();
  const shul = await data.shul({ name: 'Portal Shul' });
  const otherShul = await data.shul({ name: 'Portal Other Shul', at: milesEast(HERE, 30) });
  const hiddenShul = await data.shul({ name: 'Portal Hidden Shul', approved: false });
  const noPointShul = await data.shul({ name: 'Portal No Point Shul', at: null });
  const hiddenRav = await data.maggidShiur({ name: 'Portal Hidden Rav', approved: false });
  const room = await data.room(shul.id, 'Portal Room');
  const otherRoom = await data.room(otherShul.id, 'Portal Other Room');
  const topic = await data.topic('Portal Gemara');
  ids = {
    shul: shul.id,
    hiddenShul: hiddenShul.id,
    noPointShul: noPointShul.id,
    hiddenRav: hiddenRav.id,
    room: room.id,
    otherRoom: otherRoom.id,
    topic: topic.id,
  };
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
  await app.close();
});

/** Posts a shiur and checks the status. A created one is tracked so cleanUp removes it. */
async function post(body: object, status: number) {
  const response = await request(app.getHttpServer())
    .post('/portal/shiurim')
    .send(body)
    .expect(status);
  if (response.body.shiurId) data.track({ shiurId: response.body.shiurId });
  return response;
}

/** The New York weekday (0 = Sunday) and time of day of a moment. */
function nyWeekdayAndTime(at: Date) {
  const weekday = at.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  const time = at.toLocaleTimeString('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday), time };
}

const TOMORROW_NY_DAY = nyWeekdayAndTime(nyAt(1, '12:00')).day;

describe('FR-20 posting a weekly shiur', () => {
  it('makes 8 weeks of dates on its day, at its New York time', async () => {
    const response = await post(
      {
        kind: 'WEEKLY',
        title: 'Portal Weekly',
        shul: { id: ids.shul },
        room: { id: ids.room },
        startTime: '20:00',
        daysOfWeek: [TOMORROW_NY_DAY],
      },
      201,
    );
    expect(response.body.occurrenceCount).toBe(8);

    const dates = await prisma.occurrence.findMany({
      where: { shiurId: response.body.shiurId },
      orderBy: { startsAt: 'asc' },
    });
    expect(dates[0].id).toBe(response.body.firstOccurrenceId);
    for (const date of dates) {
      expect(nyWeekdayAndTime(date.startsAt)).toEqual({ day: TOMORROW_NY_DAY, time: '20:00' });
      // No length given: an hour.
      expect(date.endsAt!.getTime() - date.startsAt.getTime()).toBe(60 * 60_000);
    }
  });

  it('shows up on the map right away', async () => {
    const response = await post(
      {
        kind: 'WEEKLY',
        title: 'Portal On The Map',
        shul: { id: ids.shul },
        startTime: '19:00',
        daysOfWeek: [TOMORROW_NY_DAY],
      },
      201,
    );

    const map = await request(app.getHttpServer())
      .get(`/map/search?lat=${HERE.lat}&lng=${HERE.lng}`)
      .expect(200);
    expect(map.body.weekly).toContainEqual(
      expect.objectContaining({ occurrenceId: response.body.firstOccurrenceId }),
    );
  });
});

describe('FR-20 posting a featured shiur', () => {
  it('makes one date at its New York time, with its length', async () => {
    const date = nyAt(3, '12:00').toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const response = await post(
      {
        kind: 'FEATURED',
        title: 'Portal Featured',
        shul: { id: ids.shul },
        startTime: '19:30',
        date,
        durationMinutes: 90,
      },
      201,
    );

    const [occurrence] = await prisma.occurrence.findMany({
      where: { shiurId: response.body.shiurId },
    });
    expect(response.body.occurrenceCount).toBe(1);
    expect(occurrence.startsAt.toISOString()).toBe(nyAt(3, '19:30').toISOString());
    expect(occurrence.endsAt!.getTime() - occurrence.startsAt.getTime()).toBe(90 * 60_000);
  });

  it('turns down a date that already passed', async () => {
    const yesterday = nyAt(-1, '12:00').toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });
    const response = await post(
      {
        kind: 'FEATURED',
        title: 'Portal Too Late',
        shul: { id: ids.shul },
        startTime: '19:30',
        date: yesterday,
      },
      400,
    );
    expect(response.body.code).toBe('DATE_PASSED');
  });
});

describe('FR-20 typing in new names', () => {
  it('adds a new shul with its map point, so its shiur is on the map', async () => {
    const at = milesEast(HERE, 60);
    const response = await post(
      {
        kind: 'WEEKLY',
        title: 'Portal New Shul Shiur',
        shul: { name: 'Portal Typed Shul', address: '1 Main St', lat: at.lat, lng: at.lng },
        room: { name: 'Typed Room' },
        startTime: '20:00',
        daysOfWeek: [TOMORROW_NY_DAY],
      },
      201,
    );
    const shiur = await prisma.shiur.findUniqueOrThrow({ where: { id: response.body.shiurId } });
    data.track({ publisherId: shiur.shulId! });

    const map = await request(app.getHttpServer())
      .get(`/map/search?lat=${at.lat}&lng=${at.lng}&radiusMiles=1`)
      .expect(200);
    expect(map.body.pins).toEqual([expect.objectContaining({ name: 'Portal Typed Shul' })]);
    expect(map.body.weekly[0]).toMatchObject({
      title: 'Portal New Shul Shiur',
      room: 'Typed Room',
    });
  });

  it('uses an existing topic when the typed name matches, ignoring capitals', async () => {
    const response = await post(
      {
        kind: 'WEEKLY',
        title: 'Portal Typed Topic',
        shul: { id: ids.shul },
        topic: { name: 'portal GEMARA' },
        startTime: '20:00',
        daysOfWeek: [TOMORROW_NY_DAY],
      },
      201,
    );
    const shiur = await prisma.shiur.findUniqueOrThrow({ where: { id: response.body.shiurId } });
    expect(shiur.topicId).toBe(ids.topic);
  });
});

describe('FR-20 what is turned down', () => {
  const weekly = { kind: 'WEEKLY', title: 'Portal Rejected', startTime: '20:00', daysOfWeek: [1] };

  it('is a 404 for an unapproved shul, the same as a missing one (NFR-4)', async () => {
    const hidden = await post({ ...weekly, shul: { id: ids.hiddenShul } }, 404);
    const missing = await post({ ...weekly, shul: { id: 'no-such-id' } }, 404);
    expect(hidden.body).toEqual(missing.body);
  });

  it('is a 404 for a shul with no map point, which would never show on the map', async () => {
    await post({ ...weekly, shul: { id: ids.noPointShul } }, 404);
  });

  it('turns down an unapproved maggid shiur and a room from another shul', async () => {
    await post({ ...weekly, shul: { id: ids.shul }, maggidShiur: { id: ids.hiddenRav } }, 400);
    await post({ ...weekly, shul: { id: ids.shul }, room: { id: ids.otherRoom } }, 400);
  });

  it('turns down a form with no title', async () => {
    const response = await post({ ...weekly, title: '', shul: { id: ids.shul } }, 400);
    expect(response.body.code).toBe('INVALID_REQUEST');
  });
});

describe('FR-20 GET /portal/options', () => {
  it('offers approved shuls with a map point, each with its rooms', async () => {
    const response = await request(app.getHttpServer()).get('/portal/options').expect(200);
    const shulIds = response.body.shuls.map((shul: { id: string }) => shul.id);
    expect(shulIds).toContain(ids.shul);
    expect(shulIds).not.toContain(ids.hiddenShul);
    expect(shulIds).not.toContain(ids.noPointShul);

    const shul = response.body.shuls.find((s: { id: string }) => s.id === ids.shul);
    expect(shul.rooms).toEqual([{ id: ids.room, name: 'Portal Room' }]);
  });

  it('never offers an unapproved maggid shiur (NFR-4)', async () => {
    const response = await request(app.getHttpServer()).get('/portal/options').expect(200);
    const ravIds = response.body.maggideiShiur.map((rav: { id: string }) => rav.id);
    expect(ravIds).not.toContain(ids.hiddenRav);
  });
});

describe('FR-20 start times across the clock change', () => {
  it('keeps a featured shiur at its New York time on the day the clocks go back', async () => {
    expect((await queries.featuredStart('2026-11-01', '05:00')).toISOString()).toBe(
      '2026-11-01T10:00:00.000Z',
    );
    expect((await queries.featuredStart('2026-11-01', '20:00')).toISOString()).toBe(
      '2026-11-02T01:00:00.000Z',
    );
  });

  it('keeps it at its New York time in summer', async () => {
    expect((await queries.featuredStart('2026-07-01', '10:00')).toISOString()).toBe(
      '2026-07-01T14:00:00.000Z',
    );
  });
});
