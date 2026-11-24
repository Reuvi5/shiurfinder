// The shul and maggid shiur pages' SQL on a real database (FR-10, FR-19):
// which shiurim each page lists, and what it must never show (NFR-4).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import { minutesFromNow, nyAt, TestData, testPlace } from '../../../core/testing/test-data';
import { PublishersQueries } from '../publishers.queries';

const prisma = new PrismaService();
const queries = new PublishersQueries(prisma);
const data = new TestData(prisma, testPlace(5));

let ids: Record<string, string> = {};

beforeAll(async () => {
  const shul = await data.shul({ name: 'Zichron Shul' });
  const otherShul = await data.shul({ name: 'Adas Shul' });
  const hiddenShul = await data.shul({ name: 'Hidden Page Shul', approved: false });
  const rav = await data.maggidShiur({ name: 'Rabbi Page' });
  const hiddenRav = await data.maggidShiur({ name: 'Rabbi Hidden Page', approved: false });

  const weekly = await data.shiur({ title: 'Weekly', shulId: shul.id, dates: [nyAt(1, '20:00')] });
  const featured = await data.shiur({
    title: 'Featured',
    kind: 'FEATURED',
    shulId: shul.id,
    maggidShiurId: hiddenRav.id,
    dates: [nyAt(2, '20:00')],
  });
  const cancelled = await data.shiur({
    title: 'Cancelled',
    shulId: shul.id,
    dates: [{ startsAt: nyAt(3, '20:00'), status: 'CANCELLED' }],
  });
  const past = await data.shiur({ title: 'Past', shulId: shul.id, dates: [minutesFromNow(-60)] });
  const tooLate = await data.shiur({
    title: 'Too Late',
    shulId: shul.id,
    dates: [nyAt(8, '20:00')],
  });

  const ravAtShul = await data.shiur({
    title: 'Rav at Shul',
    shulId: otherShul.id,
    maggidShiurId: rav.id,
    dates: [nyAt(1, '19:00')],
  });
  const ravAlone = await data.shiur({
    title: 'Rav Alone',
    maggidShiurId: rav.id,
    dates: [nyAt(2, '19:00')],
  });
  const ravAtHiddenShul = await data.shiur({
    title: 'Rav at Hidden Shul',
    shulId: hiddenShul.id,
    maggidShiurId: rav.id,
    dates: [nyAt(3, '19:00')],
  });
  // A shul where the rav's only date is cancelled: not one of "their shuls".
  const cancelledOnlyShul = await data.shul({ name: 'Bais Cancelled' });
  const ravCancelled = await data.shiur({
    title: 'Rav Cancelled',
    shulId: cancelledOnlyShul.id,
    maggidShiurId: rav.id,
    dates: [{ startsAt: nyAt(4, '19:00'), status: 'CANCELLED' }],
  });

  ids = {
    shul: shul.id,
    otherShul: otherShul.id,
    hiddenShul: hiddenShul.id,
    rav: rav.id,
    hiddenRav: hiddenRav.id,
    weekly: weekly.occurrenceIds[0],
    featured: featured.occurrenceIds[0],
    cancelled: cancelled.occurrenceIds[0],
    past: past.occurrenceIds[0],
    tooLate: tooLate.occurrenceIds[0],
    ravAtShul: ravAtShul.occurrenceIds[0],
    ravAlone: ravAlone.occurrenceIds[0],
    ravAtHiddenShul: ravAtHiddenShul.occurrenceIds[0],
    ravCancelled: ravCancelled.occurrenceIds[0],
  };
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
});

describe("FR-10 a shul's page lists", () => {
  it('its shiurim in the next 7 days, soonest first, cancelled ones included', async () => {
    const rows = await queries.findUpcoming({ shulId: ids.shul });
    expect(rows.map((row) => row.occurrenceId)).toEqual([ids.weekly, ids.featured, ids.cancelled]);
  });

  it('only the kind asked for', async () => {
    const featured = await queries.findUpcoming({ shulId: ids.shul }, 'FEATURED');
    expect(featured.map((row) => row.occurrenceId)).toEqual([ids.featured]);
  });

  it('nothing past or more than 7 days away', async () => {
    const rows = (await queries.findUpcoming({ shulId: ids.shul })).map((row) => row.occurrenceId);
    expect(rows).not.toContain(ids.past);
    expect(rows).not.toContain(ids.tooLate);
  });
});

describe("FR-19 a maggid shiur's page lists", () => {
  it('their shiurim at approved shuls and with no shul, cancelled ones included', async () => {
    const rows = await queries.findUpcoming({ maggidShiurId: ids.rav });
    expect(rows.map((row) => row.occurrenceId)).toEqual([
      ids.ravAtShul,
      ids.ravAlone,
      ids.ravCancelled,
    ]);
  });

  it('the approved shuls where they have a date coming up, A to Z', async () => {
    expect(await queries.findShulsOfMaggid(ids.rav)).toEqual([
      { id: ids.otherShul, name: 'Adas Shul' },
    ]);
  });
});

describe('NFR-4 the pages never show an unapproved publisher', () => {
  it('only finds an approved shul or maggid shiur', async () => {
    expect(await queries.findApprovedPublisher(ids.shul)).toMatchObject({ type: 'SHUL' });
    expect(await queries.findApprovedPublisher(ids.rav)).toMatchObject({ type: 'MAGGID_SHIUR' });
    expect(await queries.findApprovedPublisher(ids.hiddenShul)).toBeNull();
    expect(await queries.findApprovedPublisher(ids.hiddenRav)).toBeNull();
  });

  it("leaves a shiur at an unapproved shul off the maggid shiur's page", async () => {
    const rows = await queries.findUpcoming({ maggidShiurId: ids.rav });
    expect(rows.map((row) => row.occurrenceId)).not.toContain(ids.ravAtHiddenShul);
  });

  it("hides an unapproved maggid shiur's name on a shul's page", async () => {
    const rows = await queries.findUpcoming({ shulId: ids.shul }, 'FEATURED');
    expect(rows[0]).toMatchObject({ maggidShiurId: null, maggidShiurName: null });
  });
});
