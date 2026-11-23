// The map's SQL on a real database (FR-5, FR-8): what a search finds by
// distance, time, filters and text, and what it must never show (NFR-4).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  milesEast,
  minutesFromNow,
  nyAt,
  TestData,
  testPlace,
} from '../../../core/testing/test-data';
import { METERS_PER_MILE } from '../map.constants';
import { MapQueries } from '../map.queries';
import type { MapSearchInput } from '../map.validation';

const prisma = new PrismaService();
const queries = new MapQueries(prisma);
const HERE = testPlace(1);
const data = new TestData(prisma, HERE);

/** One evening shiur, 9:30pm New York in two days: already the next day in UTC. */
const EVENING = nyAt(2, '21:30');

/** The New York day of the week of a moment, 0 = Sunday. */
function nyDayOfWeek(at: Date): number {
  const name = at.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

let ids: Record<string, string> = {};

beforeAll(async () => {
  const shul = await data.shul({ name: 'Ohr Torah' });
  const farShul = await data.shul({ name: 'Far Shul', at: milesEast(HERE, 15) });
  const hiddenShul = await data.shul({ name: 'Hidden Shul', approved: false });
  const rav = await data.maggidShiur({ name: 'Rabbi Approved' });
  const hiddenRav = await data.maggidShiur({ name: 'Rabbi Unapproved', approved: false });
  const gemara = await data.topic('Gemara');
  const halacha = await data.topic('Halacha');
  const english = await data.language('English');
  const women = await data.audience('Women');

  const evening = await data.shiur({
    title: 'Evening Chaburah',
    shulId: shul.id,
    maggidShiurId: rav.id,
    topicId: gemara.id,
    languageId: english.id,
    audienceId: women.id,
    dates: [EVENING],
  });
  const featured = await data.shiur({
    title: 'Guest Lecture',
    kind: 'FEATURED',
    shulId: shul.id,
    maggidShiurId: hiddenRav.id,
    topicId: halacha.id,
    dates: [nyAt(3, '12:00')],
  });
  const far = await data.shiur({
    title: 'Far Away Shiur',
    shulId: farShul.id,
    dates: [nyAt(2, '20:00')],
  });
  const hidden = await data.shiur({
    title: 'Hidden Shiur',
    shulId: hiddenShul.id,
    dates: [nyAt(2, '20:00')],
  });
  const cancelled = await data.shiur({
    title: 'Cancelled Shiur',
    shulId: shul.id,
    dates: [{ startsAt: nyAt(2, '19:00'), status: 'CANCELLED' }],
  });
  const past = await data.shiur({
    title: 'Past Shiur',
    shulId: shul.id,
    dates: [minutesFromNow(-120)],
  });
  const tooLate = await data.shiur({
    title: 'Next Month Shiur',
    shulId: shul.id,
    dates: [nyAt(8, '20:00')],
  });

  ids = {
    shul: shul.id,
    farShul: farShul.id,
    hiddenShul: hiddenShul.id,
    evening: evening.occurrenceIds[0],
    featured: featured.occurrenceIds[0],
    far: far.occurrenceIds[0],
    hidden: hidden.occurrenceIds[0],
    cancelled: cancelled.occurrenceIds[0],
    past: past.occurrenceIds[0],
    tooLate: tooLate.occurrenceIds[0],
  };
});

afterAll(async () => {
  await data.cleanUp();
  await prisma.$disconnect();
});

/** The occurrence ids a search finds, within `radiusMiles` (10 if not given). */
async function found(filters: Partial<MapSearchInput> = {}, radiusMiles = 10): Promise<string[]> {
  const input = { ...HERE, ...filters };
  const rows = await queries.findShiurim(input, radiusMiles * METERS_PER_MILE);
  return rows.map((row) => row.occurrenceId);
}

describe('FR-5 map search: what is found', () => {
  it('finds upcoming shiurim inside the radius, soonest first', async () => {
    expect(await found()).toEqual([ids.evening, ids.featured]);
  });

  it('reaches a shul further away once the radius covers it', async () => {
    expect(await found({}, 10)).not.toContain(ids.far);
    expect(await found({}, 20)).toContain(ids.far);
  });

  it('leaves out cancelled, past, and more than 7 days away', async () => {
    const all = await found({}, 20);
    expect(all).not.toContain(ids.cancelled);
    expect(all).not.toContain(ids.past);
    expect(all).not.toContain(ids.tooLate);
  });

  it('gives the distance in miles', async () => {
    const rows = await queries.findShiurim(milesEast(HERE, 3), 10 * METERS_PER_MILE);
    expect(rows[0].distanceMiles).toBeCloseTo(3, 1);
  });

  it('gives each pin a count that matches the list behind it', async () => {
    const radius = 20 * METERS_PER_MILE;
    const pins = await queries.findPins(HERE, radius);
    const list = await queries.findShiurim(HERE, radius);

    expect(pins.map((pin) => pin.publisherId)).toEqual([ids.shul, ids.farShul]);
    for (const pin of pins) {
      const rowsAtPin = list.filter((row) => row.shulId === pin.publisherId);
      expect(Number(pin.upcomingCount)).toBe(rowsAtPin.length);
    }
  });
});

describe('NFR-4 map search: nothing from an unapproved publisher', () => {
  it("never shows an unapproved shul's pin or shiurim", async () => {
    const pins = await queries.findPins(HERE, 20 * METERS_PER_MILE);
    expect(pins.map((pin) => pin.publisherId)).not.toContain(ids.hiddenShul);
    expect(await found({}, 20)).not.toContain(ids.hidden);
  });

  it("hides an unapproved maggid shiur's name on an approved shul's shiur", async () => {
    const rows = await queries.findShiurim(HERE, 10 * METERS_PER_MILE);
    const featured = rows.find((row) => row.occurrenceId === ids.featured);
    expect(featured?.maggidShiurId).toBeNull();
    expect(featured?.maggidShiurName).toBeNull();
  });

  it("can't be searched by an unapproved maggid shiur's name", async () => {
    expect(await found({ q: 'Rabbi Unapproved' })).toEqual([]);
    expect(await found({ q: 'Rabbi Approved' })).toEqual([ids.evening]);
  });
});

describe('FR-8 map filters, in New York time', () => {
  it('matches the New York day, not the UTC one', async () => {
    const nyDay = nyDayOfWeek(EVENING);
    expect(await found({ dayOfWeek: nyDay })).toContain(ids.evening);
    // In UTC, 9:30pm New York is already the next day.
    expect(await found({ dayOfWeek: (nyDay + 1) % 7 })).not.toContain(ids.evening);
  });

  it('matches the New York time of day', async () => {
    expect(await found({ afterTime: '21:00' })).toContain(ids.evening);
    expect(await found({ afterTime: '22:00' })).not.toContain(ids.evening);
    expect(await found({ beforeTime: '21:30' })).not.toContain(ids.evening);
    expect(await found({ beforeTime: '21:31' })).toContain(ids.evening);
  });

  it('filters by topic, language and audience', async () => {
    expect(await found({ topic: 'Gemara' })).toEqual([ids.evening]);
    expect(await found({ topic: 'Halacha' })).toEqual([ids.featured]);
    expect(await found({ language: 'English' })).toEqual([ids.evening]);
    expect(await found({ audience: 'Women' })).toEqual([ids.evening]);
    expect(await found({ topic: 'No Such Topic' })).toEqual([]);
  });
});

describe('FR-5 the search box', () => {
  it('finds a word in the title or shul name, in any case', async () => {
    expect(await found({ q: 'chaburah' })).toEqual([ids.evening]);
    expect(await found({ q: 'ohr torah' })).toEqual([ids.evening, ids.featured]);
  });

  it('allows a typo in the topic', async () => {
    expect(await found({ q: 'gemora' })).toEqual([ids.evening]);
  });

  it('finds nothing for an unrelated word', async () => {
    expect(await found({ q: 'zzzqqq' })).toEqual([]);
  });
});

describe("FR-9 a shul's card: the rest of today", () => {
  it("shows a shul's shiurim later today, but not earlier today or tomorrow", async () => {
    // Its own shul, out of the other tests' search radius.
    const shul = await data.shul({ name: 'Card Shul', at: milesEast(HERE, 60) });
    const soon = minutesFromNow(2);
    const later = await data.shiur({ title: 'Later Today', shulId: shul.id, dates: [soon] });
    const earlier = await data.shiur({
      title: 'Earlier Today',
      shulId: shul.id,
      dates: [minutesFromNow(-2)],
    });
    const tomorrow = await data.shiur({
      title: 'Tomorrow',
      shulId: shul.id,
      dates: [nyAt(1, '12:00')],
    });

    const rows = (await queries.findShulToday(shul.id)).map((row) => row.occurrenceId);
    // Two minutes from now is only still "today" before 11:58pm New York.
    const stillToday =
      soon.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) ===
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    expect(rows.includes(later.occurrenceIds[0])).toBe(stillToday);
    expect(rows).not.toContain(earlier.occurrenceIds[0]);
    expect(rows).not.toContain(tomorrow.occurrenceIds[0]);
  });

  it('only finds an approved shul', async () => {
    expect(await queries.findApprovedShul(ids.shul)).toMatchObject({ name: 'Ohr Torah' });
    expect(await queries.findApprovedShul(ids.hiddenShul)).toBeNull();
    expect(await queries.findApprovedShul('no-such-id')).toBeNull();
  });
});

describe('FR-8 the Filters panel choices', () => {
  it('offers only what an upcoming shiur at an approved shul uses', async () => {
    const unused = await data.topic('Unused (map test)');
    const atHiddenShul = await data.topic('At Hidden Shul (map test)');
    await data.shiur({
      title: 'Hidden Topic Shiur',
      shulId: ids.hiddenShul,
      topicId: atHiddenShul.id,
      dates: [nyAt(2, '20:00')],
    });

    const names = (await queries.findFilterOptions()).map((option) => option.name);
    expect(names).toContain('Gemara');
    expect(names).toContain('English');
    expect(names).toContain('Women');
    expect(names).not.toContain(unused.name);
    expect(names).not.toContain(atHiddenShul.name);
  });
});
