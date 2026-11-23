// The shiur page's SQL on a real database (FR-9): which shiurim can be opened
// (NFR-4), and the room, distance and old dates.

import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  milesEast,
  minutesFromNow,
  nyAt,
  TestData,
  testPlace,
} from '../../../core/testing/test-data';
import { ShiurPageQueries } from '../shiur-page.queries';

const prisma = new PrismaService();
const queries = new ShiurPageQueries(prisma);
const HERE = testPlace(3);
const data = new TestData(prisma, HERE);

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
});

/** Makes a shiur with one date and returns what the shiur page finds for it. */
async function open(input: { shulId?: string; maggidShiurId?: string }) {
  const { occurrenceIds } = await data.shiur({
    title: 'Page Shiur',
    ...input,
    dates: [nyAt(2, '20:00')],
  });
  return queries.findDetails(occurrenceIds[0]);
}

describe('NFR-4 which shiurim can be opened', () => {
  it('opens a shiur at an approved shul', async () => {
    const shul = await data.shul({ name: 'Page Shul' });
    expect(await open({ shulId: shul.id })).toMatchObject({ shulName: 'Page Shul' });
  });

  it('hides a shiur at an unapproved shul, even with an approved maggid shiur', async () => {
    const shul = await data.shul({ name: 'Page Hidden Shul', approved: false });
    const rav = await data.maggidShiur({ name: 'Page Rav' });
    expect(await open({ shulId: shul.id, maggidShiurId: rav.id })).toBeNull();
  });

  it('opens a shiur with no shul when its maggid shiur is approved', async () => {
    const rav = await data.maggidShiur({ name: 'Page Rav Alone' });
    expect(await open({ maggidShiurId: rav.id })).toMatchObject({
      shulId: null,
      maggidShiurName: 'Page Rav Alone',
    });
  });

  it('hides a shiur with no shul when its maggid shiur is unapproved', async () => {
    const rav = await data.maggidShiur({ name: 'Page Hidden Rav', approved: false });
    expect(await open({ maggidShiurId: rav.id })).toBeNull();
  });

  it("hides an unapproved maggid shiur's name on an approved shul's shiur", async () => {
    const shul = await data.shul({ name: 'Page Shul 2' });
    const rav = await data.maggidShiur({ name: 'Page Hidden Rav 2', approved: false });
    expect(await open({ shulId: shul.id, maggidShiurId: rav.id })).toMatchObject({
      shulName: 'Page Shul 2',
      maggidShiurId: null,
      maggidShiurName: null,
    });
  });

  it('finds nothing for a missing id', async () => {
    expect(await queries.findDetails('no-such-id')).toBeNull();
  });
});

describe('FR-9 the details of one date', () => {
  it("uses this date's room over the shiur's usual one", async () => {
    const shul = await data.shul({ name: 'Room Shul' });
    const usual = await data.room(shul.id, 'Main Beis Medrash');
    const moved = await data.room(shul.id, 'Social Hall');
    const { occurrenceIds } = await data.shiur({
      title: 'Room Shiur',
      shulId: shul.id,
      roomId: usual.id,
      dates: [nyAt(2, '20:00'), { startsAt: nyAt(3, '20:00'), roomId: moved.id }],
    });

    expect((await queries.findDetails(occurrenceIds[0]))?.room).toBe('Main Beis Medrash');
    expect((await queries.findDetails(occurrenceIds[1]))?.room).toBe('Social Hall');
  });

  it('gives the distance only when a location is sent', async () => {
    const shul = await data.shul({ name: 'Distance Shul' });
    const { occurrenceIds } = await data.shiur({
      title: 'Distance Shiur',
      shulId: shul.id,
      dates: [nyAt(2, '20:00')],
    });
    const from = milesEast(HERE, 4);

    expect((await queries.findDetails(occurrenceIds[0]))?.distanceMiles).toBeNull();
    const withLocation = await queries.findDetails(occurrenceIds[0], from.lat, from.lng);
    expect(withLocation?.distanceMiles).toBeCloseTo(4, 1);
    expect(withLocation?.lat).toBeCloseTo(HERE.lat, 5);
    expect(withLocation?.lng).toBeCloseTo(HERE.lng, 5);
  });

  it('still opens a past or cancelled date, so an old shared link works', async () => {
    const shul = await data.shul({ name: 'Old Link Shul' });
    const { occurrenceIds } = await data.shiur({
      title: 'Old Link Shiur',
      shulId: shul.id,
      dates: [minutesFromNow(-60 * 24 * 3), { startsAt: nyAt(2, '20:00'), status: 'CANCELLED' }],
    });

    expect(await queries.findDetails(occurrenceIds[0])).not.toBeNull();
    expect(await queries.findDetails(occurrenceIds[1])).toMatchObject({ status: 'CANCELLED' });
  });
});
