// Makes rows in the test database for SQL and API tests, and removes them after.
//
//   const data = new TestData(prisma, testPlace(1));
//   const shul = await data.shul({ name: 'Beth Aaron' });
//   await data.shiur({ title: 'Daf Yomi', shulId: shul.id, dates: [nyAt(1, '20:00')] });
//   afterAll(() => data.cleanUp());
//
// Only for `*.db.test.ts` files. Each test file gets its own testPlace, far
// from every other one, so a map search in one file never finds another
// file's rows.

import { PrismaClient, type OccurrenceStatus, type ShiurKind } from '@prisma/client';
import { nyTimeToUtc } from '../time/ny-time';

// ---------------------------------------------------------------- places

export interface Place {
  lat: number;
  lng: number;
}

const MILES_PER_DEGREE_LAT = 69.17;

/**
 * A spot in an empty part of Kansas. Give each test file its own number:
 * the spots are about 110 miles apart, more than the largest search radius.
 */
export function testPlace(n: number): Place {
  return { lat: 38.5, lng: -101 + n * 2 };
}

/** A point `miles` east of a place, for testing the search radius. */
export function milesEast(place: Place, miles: number): Place {
  const milesPerDegreeLng = MILES_PER_DEGREE_LAT * Math.cos((place.lat * Math.PI) / 180);
  return { lat: place.lat, lng: place.lng + miles / milesPerDegreeLng };
}

// ---------------------------------------------------------------- times

/**
 * A New York time `days` from today's New York date, as UTC.
 * nyAt(0, '20:00') is 8pm tonight in New York, wherever the test runs.
 */
export function nyAt(days: number, hhmm: string): Date {
  const [year, month, date] = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    .split('-')
    .map(Number);
  return nyTimeToUtc(new Date(year, month - 1, date + days), hhmm);
}

/** A moment `minutes` from now (negative for the past). */
export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

// ---------------------------------------------------------------- rows

/** One date of a shiur: just a time, or a time with more about that date. */
type DateInput =
  Date | { startsAt: Date; endsAt?: Date; status?: OccurrenceStatus; roomId?: string };

interface ShiurInput {
  title: string;
  kind?: ShiurKind;
  shulId?: string;
  maggidShiurId?: string;
  roomId?: string;
  topicId?: string;
  languageId?: string;
  audienceId?: string;
  description?: string;
  daysOfWeek?: number[];
  durationMinutes?: number | null;
  createdAt?: Date;
  dates: DateInput[];
}

export class TestData {
  private readonly publisherIds: string[] = [];
  private readonly shiurIds: string[] = [];
  private readonly topicIds: string[] = [];
  private readonly languageIds: string[] = [];
  private readonly audienceIds: string[] = [];

  /** `place` is where shuls go when a test doesn't say. */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly place: Place,
  ) {}

  /** An approved shul at this file's place, unless told otherwise. */
  async shul(input: { name: string; approved?: boolean; at?: Place | null; address?: string }) {
    const shul = await this.prisma.publisher.create({
      data: {
        type: 'SHUL',
        name: input.name,
        approved: input.approved ?? true,
        address: input.address,
      },
    });
    this.publisherIds.push(shul.id);

    // The map point is a PostGIS column Prisma can't write. Longitude first.
    const at = input.at === undefined ? this.place : input.at;
    if (at) {
      await this.prisma.$executeRaw`
        UPDATE "Publisher"
        SET location = ST_SetSRID(ST_MakePoint(${at.lng}, ${at.lat}), 4326)::geography
        WHERE id = ${shul.id}
      `;
    }
    return shul;
  }

  /** An approved maggid shiur, unless told otherwise. */
  async maggidShiur(input: { name: string; approved?: boolean }) {
    const rav = await this.prisma.publisher.create({
      data: { type: 'MAGGID_SHIUR', name: input.name, approved: input.approved ?? true },
    });
    this.publisherIds.push(rav.id);
    return rav;
  }

  async room(publisherId: string, name: string) {
    return this.prisma.room.create({ data: { publisherId, name } });
  }

  async topic(name: string) {
    const topic = await this.prisma.topic.create({ data: { name } });
    this.topicIds.push(topic.id);
    return topic;
  }

  async language(name: string) {
    const language = await this.prisma.language.create({ data: { name } });
    this.languageIds.push(language.id);
    return language;
  }

  async audience(name: string) {
    const audience = await this.prisma.audience.create({ data: { name } });
    this.audienceIds.push(audience.id);
    return audience;
  }

  /** A shiur and its dates. Returns the shiur and the dates' ids, in order. */
  async shiur(input: ShiurInput) {
    const { dates, ...fields } = input;
    const shiur = await this.prisma.shiur.create({
      data: { kind: 'WEEKLY', ...fields, durationMinutes: fields.durationMinutes ?? null },
    });
    this.shiurIds.push(shiur.id);

    const occurrenceIds: string[] = [];
    for (const date of dates) {
      const fieldsOfDate = date instanceof Date ? { startsAt: date } : date;
      const occurrence = await this.prisma.occurrence.create({
        data: { shiurId: shiur.id, ...fieldsOfDate },
      });
      occurrenceIds.push(occurrence.id);
    }
    return { shiur, occurrenceIds };
  }

  /**
   * Rows the server made during a test (e.g. a POST), so cleanUp removes them too.
   * A typed-in topic that matched an existing one isn't new: don't track it.
   */
  track(rows: {
    shiurId?: string;
    publisherId?: string;
    topicId?: string;
    languageId?: string;
  }): void {
    if (rows.shiurId) this.shiurIds.push(rows.shiurId);
    if (rows.publisherId) this.publisherIds.push(rows.publisherId);
    if (rows.topicId) this.topicIds.push(rows.topicId);
    if (rows.languageId) this.languageIds.push(rows.languageId);
  }

  /** Removes everything this file made, so the next file starts clean. */
  async cleanUp(): Promise<void> {
    // Shiurim first: a maggid shiur's shiur isn't deleted with its publisher.
    await this.prisma.shiur.deleteMany({ where: { id: { in: this.shiurIds } } });
    await this.prisma.publisher.deleteMany({ where: { id: { in: this.publisherIds } } });
    await this.prisma.topic.deleteMany({ where: { id: { in: this.topicIds } } });
    await this.prisma.language.deleteMany({ where: { id: { in: this.languageIds } } });
    await this.prisma.audience.deleteMany({ where: { id: { in: this.audienceIds } } });
  }
}
