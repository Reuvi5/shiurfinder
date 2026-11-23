// The SQL for the publisher portal (FR-20).
//
// This file only reads and writes rows. Deciding what's allowed (which room,
// a date in the past) happens in portal.service.ts.
//
// Some queries are raw SQL: the shul's map point is a PostGIS column Prisma
// can't read or write, and the New York -> UTC conversion is done by Postgres
// so it is right across daylight-saving changes. Everything else is Prisma.

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { NewShul, PortalChoice, PortalOptions } from '@shiurfinder/shared';
import { PrismaService } from '../../core/database/prisma.service';
import type { PickOrNewInput } from './portal.validation';

/**
 * A New York date + "HH:mm" as a real moment in time (timestamptz). The
 * reverse of STARTS_AT_NY in map.queries.ts. Postgres knows New York's
 * offset on that date, so an 8pm shiur stays at 8pm after the clocks change.
 */
function nyMoment(date: Prisma.Sql, time: string) {
  return Prisma.sql`((${date} + ${time}::time) AT TIME ZONE 'America/New_York')`;
}

/** Today's date in New York. */
const TODAY_NY = Prisma.sql`(NOW() AT TIME ZONE 'America/New_York')::date`;

/** New topics and languages go after the ones already in the list. */
const NEW_LIST_SORT = 100;

/** A shul the form can offer. */
export interface ShulRow {
  id: string;
  name: string;
  address: string | null;
}

/** A room, with the shul it's in. */
export interface RoomRow extends PortalChoice {
  publisherId: string;
}

/** Everything a new shiur points at, each picked by id or typed in as a new name. */
export interface ShiurDraft {
  shul: { id: string } | NewShul;
  maggidShiur?: PickOrNewInput;
  room?: PickOrNewInput;
  topic?: PickOrNewInput;
  language?: PickOrNewInput;
  /** the rest of the Shiur row */
  fields: Omit<
    Prisma.ShiurUncheckedCreateInput,
    'shulId' | 'maggidShiurId' | 'roomId' | 'topicId' | 'languageId'
  >;
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class PortalQueries {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- the form's choices

  /**
   * Approved shuls with a map point. A shul without one would never show up on
   * the map (map.queries.ts skips it), so it isn't offered.
   */
  async findShuls(id?: string): Promise<ShulRow[]> {
    return this.prisma.$queryRaw<ShulRow[]>`
      SELECT id, "name", "address"
      FROM "Publisher"
      WHERE "approved" = true
        AND "type" = 'SHUL'
        AND location IS NOT NULL
        ${id ? Prisma.sql`AND id = ${id}` : Prisma.empty}
      ORDER BY "name";
    `;
  }

  async findOptions(): Promise<Omit<PortalOptions, 'shuls'> & { rooms: RoomRow[] }> {
    const byName = { orderBy: { name: 'asc' as const }, select: { id: true, name: true } };
    const bySort = {
      orderBy: [{ sort: 'asc' as const }, { name: 'asc' as const }],
      select: { id: true, name: true },
    };

    const [rooms, maggideiShiur, topics, languages, audiences] = await Promise.all([
      this.prisma.room.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, publisherId: true },
      }),
      this.prisma.publisher.findMany({
        where: { approved: true, type: 'MAGGID_SHIUR' },
        ...byName,
      }),
      this.prisma.topic.findMany(bySort),
      this.prisma.language.findMany(bySort),
      this.prisma.audience.findMany(bySort),
    ]);
    return { rooms, maggideiShiur, topics, languages, audiences };
  }

  // ---------------------------------------------------------------- checks

  async maggidShiurExists(id: string): Promise<boolean> {
    const count = await this.prisma.publisher.count({
      where: { id, approved: true, type: 'MAGGID_SHIUR' },
    });
    return count > 0;
  }

  async roomBelongsTo(roomId: string, shulId: string): Promise<boolean> {
    return (await this.prisma.room.count({ where: { id: roomId, publisherId: shulId } })) > 0;
  }

  async topicExists(id: string): Promise<boolean> {
    return (await this.prisma.topic.count({ where: { id } })) > 0;
  }

  async languageExists(id: string): Promise<boolean> {
    return (await this.prisma.language.count({ where: { id } })) > 0;
  }

  async audienceExists(id: string): Promise<boolean> {
    return (await this.prisma.audience.count({ where: { id } })) > 0;
  }

  // ---------------------------------------------------------------- dates

  /**
   * Every start time of a weekly shiur from today through `days` days out,
   * on its days of the week, skipping any already past today.
   */
  async weeklyStarts(daysOfWeek: number[], startTime: string, days: number): Promise<Date[]> {
    const start = nyMoment(Prisma.sql`d.day`, startTime);
    const rows = await this.prisma.$queryRaw<{ startsAt: Date }[]>`
      SELECT ${start} AS "startsAt"
      FROM (SELECT ${TODAY_NY} + i AS day FROM generate_series(0, ${days - 1}::int) AS i) d
      WHERE EXTRACT(DOW FROM d.day) = ANY(${daysOfWeek}::int[])
        AND ${start} > NOW()
      ORDER BY 1;
    `;
    return rows.map((row) => row.startsAt);
  }

  /** A featured shiur's one start time. */
  async featuredStart(date: string, startTime: string): Promise<Date> {
    const rows = await this.prisma.$queryRaw<{ startsAt: Date }[]>`
      SELECT ${nyMoment(Prisma.sql`${date}::date`, startTime)} AS "startsAt";
    `;
    return rows[0].startsAt;
  }

  // ---------------------------------------------------------------- saving

  /**
   * Adds anything typed in as new, then the shiur, its dates and a history
   * line. All or nothing: a failure halfway never leaves a new shul or a
   * shiur with no dates behind.
   */
  async create(
    draft: ShiurDraft,
    starts: Date[],
    durationMinutes: number,
  ): Promise<{ shiurId: string; occurrenceIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const shulId = 'id' in draft.shul ? draft.shul.id : await createShul(tx, draft.shul);

      const created = await tx.shiur.create({
        data: {
          ...draft.fields,
          shulId,
          maggidShiurId: draft.maggidShiur && (await maggidShiurId(tx, draft.maggidShiur)),
          roomId: draft.room && (await roomId(tx, draft.room, shulId)),
          topicId: draft.topic && (await topicId(tx, draft.topic)),
          languageId: draft.language && (await languageId(tx, draft.language)),
        },
        select: { id: true },
      });

      await tx.occurrence.createMany({
        data: starts.map((startsAt) => ({
          shiurId: created.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
        })),
      });
      await tx.changeHistory.create({ data: { shiurId: created.id, summary: 'created' } });

      const occurrences = await tx.occurrence.findMany({
        where: { shiurId: created.id },
        orderBy: { startsAt: 'asc' },
        select: { id: true },
      });
      return { shiurId: created.id, occurrenceIds: occurrences.map((o) => o.id) };
    });
  }
}

// ---------------------------------------------------------------- find or add
// Each takes a picked id or a typed name. A typed name that matches one already
// there (ignoring capitals) uses that one, so "gemara" doesn't add a second Gemara.

/**
 * A new shul, approved straight away so it's on the map (no moderation yet,
 * NFR-4 comes with accounts). Two shuls can share a name in different towns,
 * so a typed shul is always added, never matched.
 */
async function createShul(tx: Tx, shul: NewShul): Promise<string> {
  const { id } = await tx.publisher.create({
    data: { type: 'SHUL', name: shul.name, address: shul.address, approved: true },
    select: { id: true },
  });
  // Prisma can't write the geography column. Longitude first: ST_MakePoint(lng, lat).
  await tx.$executeRaw`
    UPDATE "Publisher"
    SET location = ST_SetSRID(ST_MakePoint(${shul.lng}, ${shul.lat}), 4326)::geography
    WHERE id = ${id};
  `;
  return id;
}

/** Approved straight away, like a new shul. */
async function maggidShiurId(tx: Tx, pick: PickOrNewInput): Promise<string> {
  if ('id' in pick) return pick.id;
  const where = {
    type: 'MAGGID_SHIUR' as const,
    name: { equals: pick.name, mode: 'insensitive' as const },
  };
  const found = await tx.publisher.findFirst({ where, select: { id: true } });
  if (found) return found.id;
  const created = await tx.publisher.create({
    data: { type: 'MAGGID_SHIUR', name: pick.name, approved: true },
    select: { id: true },
  });
  return created.id;
}

/** A typed room is added to this shul. */
async function roomId(tx: Tx, pick: PickOrNewInput, shulId: string): Promise<string> {
  if ('id' in pick) return pick.id;
  const where = { publisherId: shulId, name: { equals: pick.name, mode: 'insensitive' as const } };
  const found = await tx.room.findFirst({ where, select: { id: true } });
  if (found) return found.id;
  const created = await tx.room.create({
    data: { publisherId: shulId, name: pick.name },
    select: { id: true },
  });
  return created.id;
}

async function topicId(tx: Tx, pick: PickOrNewInput): Promise<string> {
  if ('id' in pick) return pick.id;
  const where = { name: { equals: pick.name, mode: 'insensitive' as const } };
  const found = await tx.topic.findFirst({ where, select: { id: true } });
  if (found) return found.id;
  const created = await tx.topic.create({
    data: { name: pick.name, sort: NEW_LIST_SORT },
    select: { id: true },
  });
  return created.id;
}

async function languageId(tx: Tx, pick: PickOrNewInput): Promise<string> {
  if ('id' in pick) return pick.id;
  const where = { name: { equals: pick.name, mode: 'insensitive' as const } };
  const found = await tx.language.findFirst({ where, select: { id: true } });
  if (found) return found.id;
  const created = await tx.language.create({
    data: { name: pick.name, sort: NEW_LIST_SORT },
    select: { id: true },
  });
  return created.id;
}
