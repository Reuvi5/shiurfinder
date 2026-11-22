// All the SQL for the map screen.
//
// This file only fetches rows. It doesn't decide what they mean (which list a
// shiur goes in, whether it's "New"). That happens in map.service.ts.
//
// Why raw SQL instead of normal Prisma calls? Prisma can't do distance
// searches. The shul's location is a PostGIS `geography` column, which Prisma
// can't read or filter, so the distance queries are written by hand.
// See docs/architecture.md, "Database notes".
//
// Two things to remember when editing these queries:
//   1. PostGIS takes longitude FIRST: ST_MakePoint(lng, lat).
//   2. "startsAt" holds UTC. To filter by New York day or time, use
//      STARTS_AT_NY below, never "startsAt" directly.

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MAP_WINDOW_DAYS, METERS_PER_MILE } from './map.constants';
import type { MapSearchInput } from './map.validation';

const sql = Prisma.sql;
const NOTHING = Prisma.empty; // an empty piece of SQL, for filters that aren't set

/**
 * An occurrence's start time converted to New York local time.
 *
 * "startsAt" is a TIMESTAMP (no time zone) that holds UTC. Converting takes two
 * steps: first mark it as UTC, then convert to New York. Doing only the second
 * step shifts every time the wrong way (a 10am shiur shows up at 3pm).
 */
const STARTS_AT_NY = sql`((o."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')`;

// ---------------------------------------------------------------- row shapes
// What each query returns, straight from the database, before map.service.ts
// turns it into the shapes the website receives.

/** One shul pin on the map. */
export interface PinRow {
  publisherId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  upcomingCount: bigint; // COUNT() comes back as a bigint
}

/** One upcoming shiur (one occurrence), as shown in a list. */
export interface ListRow {
  occurrenceId: string;
  shiurId: string;
  kind: 'WEEKLY' | 'FEATURED';
  title: string;
  startsAt: Date;
  status: 'ON' | 'CHANGED' | 'REPORTED' | 'CANCELLED';
  topic: string | null;
  language: string | null;
  flyerUrl: string | null;
  shulId: string | null;
  shulName: string | null;
  maggidShiurId: string | null;
  maggidShiurName: string | null;
  room: string | null;
  distanceMiles: number;
  lat: number;
  lng: number;
  shiurCreatedAt: Date;
}

export interface ShulRow {
  id: string;
  name: string;
  address: string | null;
}

/** One choice for the Filters panel, tagged with which group it belongs to. */
export interface FilterOptionRow {
  kind: 'topic' | 'language' | 'audience';
  name: string;
  sort: number;
}

// ---------------------------------------------------------------- queries

@Injectable()
export class MapQueries {
  constructor(private readonly prisma: PrismaService) {}

  /** One row per approved shul inside the radius that has upcoming shiurim. */
  async findPins(input: MapSearchInput, radiusMeters: number): Promise<PinRow[]> {
    return this.prisma.$queryRaw<PinRow[]>`
      SELECT
        shul.id                                                AS "publisherId",
        shul."name"                                            AS "name",
        ST_Y(shul.location::geometry)                          AS "lat",
        ST_X(shul.location::geometry)                          AS "lng",
        ST_Distance(shul.location, ST_MakePoint(${input.lng}, ${input.lat})::geography)
          / ${METERS_PER_MILE}                                 AS "distanceMiles",
        COUNT(DISTINCT o.id)                                   AS "upcomingCount"
      FROM "Publisher" shul
      JOIN "Shiur"      s ON s."shulId" = shul.id
      JOIN "Occurrence" o ON o."shiurId" = s.id
      LEFT JOIN "Publisher" rav ON s."maggidShiurId" = rav.id
      LEFT JOIN "Topic"     t   ON s."topicId"    = t.id
      LEFT JOIN "Language"  l   ON s."languageId" = l.id
      LEFT JOIN "Audience"  a   ON s."audienceId" = a.id
      WHERE ${this.searchFilters(input, radiusMeters)}
      GROUP BY shul.id, shul."name", shul.location
      ORDER BY "distanceMiles" ASC
      LIMIT 300;
    `;
  }

  /** Every upcoming shiur inside the radius: the rows behind the Weekly and Featured tabs. */
  async findShiurim(input: MapSearchInput, radiusMeters: number): Promise<ListRow[]> {
    const distance = sql`ST_Distance(shul.location, ST_MakePoint(${input.lng}, ${input.lat})::geography) / ${METERS_PER_MILE}`;

    return this.prisma.$queryRaw<ListRow[]>`
      ${this.selectListRow(distance)}
      WHERE ${this.searchFilters(input, radiusMeters)}
      ORDER BY o."startsAt" ASC, "distanceMiles" ASC
      LIMIT 500;
    `;
  }

  /** One shul's shiurim for the rest of today (New York time). Shown when a pin is clicked. */
  async findShulToday(publisherId: string, lat?: number, lng?: number): Promise<ListRow[]> {
    // Without a starting point there's nothing to measure from, so distance is 0.
    const distance =
      lat !== undefined && lng !== undefined
        ? sql`ST_Distance(shul.location, ST_MakePoint(${lng}, ${lat})::geography) / ${METERS_PER_MILE}`
        : sql`0::double precision`;

    return this.prisma.$queryRaw<ListRow[]>`
      ${this.selectListRow(distance)}
      WHERE shul.id = ${publisherId}
        AND o."startsAt" >= NOW()
        AND ${STARTS_AT_NY}::date = (NOW() AT TIME ZONE 'America/New_York')::date
      ORDER BY o."startsAt" ASC;
    `;
  }

  /** The shul itself, but only if it is approved. A simple lookup, so normal Prisma works. */
  async findApprovedShul(publisherId: string): Promise<ShulRow | null> {
    return this.prisma.publisher.findFirst({
      where: { id: publisherId, approved: true, type: 'SHUL' },
      select: { id: true, name: true, address: true },
    });
  }

  /**
   * The topics, languages and audiences the Filters panel can offer: only the
   * ones at least one upcoming shiur actually uses, in each table's `sort` order.
   *
   * Not limited by distance on purpose, so the choices don't change every time
   * the user moves the search point.
   */
  async findFilterOptions(): Promise<FilterOptionRow[]> {
    return this.prisma.$queryRaw<FilterOptionRow[]>`
      WITH live AS (
        SELECT DISTINCT s."topicId", s."languageId", s."audienceId"
        FROM "Shiur" s
        JOIN "Publisher"  shul ON s."shulId" = shul.id
        JOIN "Occurrence" o    ON o."shiurId" = s.id
        WHERE shul."approved" = true
          AND shul."type" = 'SHUL'
          AND o."startsAt" >= NOW()
          AND o."startsAt" <  NOW() + (${MAP_WINDOW_DAYS} * INTERVAL '1 day')
          AND o."status" <> 'CANCELLED'
      )
      SELECT 'topic' AS "kind", t."name", t."sort" FROM "Topic" t
        WHERE t.id IN (SELECT "topicId" FROM live)
      UNION ALL
      SELECT 'language', l."name", l."sort" FROM "Language" l
        WHERE l.id IN (SELECT "languageId" FROM live)
      UNION ALL
      SELECT 'audience', a."name", a."sort" FROM "Audience" a
        WHERE a.id IN (SELECT "audienceId" FROM live)
      ORDER BY "kind", "sort", "name";
    `;
  }

  // ---------------------------------------------------------------- shared SQL pieces

  /**
   * The SELECT and JOINs for a ListRow. Used by findShiurim and findShulToday,
   * so both always return the same columns. Only the distance calculation differs.
   */
  private selectListRow(distance: Prisma.Sql) {
    return sql`
      SELECT
        o.id                            AS "occurrenceId",
        s.id                            AS "shiurId",
        s."kind"                        AS "kind",
        s."title"                       AS "title",
        o."startsAt"                    AS "startsAt",
        o."status"                      AS "status",
        t."name"                        AS "topic",
        l."name"                        AS "language",
        s."flyerUrl"                    AS "flyerUrl",
        shul.id                         AS "shulId",
        shul."name"                     AS "shulName",
        rav.id                          AS "maggidShiurId",
        rav."name"                      AS "maggidShiurName",
        -- A room set on this one date overrides the shiur's usual room.
        COALESCE(ro2."name", ro."name") AS "room",
        ${distance}                     AS "distanceMiles",
        ST_Y(shul.location::geometry)   AS "lat",
        ST_X(shul.location::geometry)   AS "lng",
        s."createdAt"                   AS "shiurCreatedAt"
      FROM "Occurrence" o
      JOIN "Shiur"      s    ON o."shiurId" = s.id
      JOIN "Publisher"  shul ON s."shulId"  = shul.id
      LEFT JOIN "Publisher" rav ON s."maggidShiurId" = rav.id
      LEFT JOIN "Room"      ro  ON s."roomId" = ro.id
      LEFT JOIN "Room"      ro2 ON o."roomId" = ro2.id
      LEFT JOIN "Topic"     t   ON s."topicId"    = t.id
      LEFT JOIN "Language"  l   ON s."languageId" = l.id
      LEFT JOIN "Audience"  a   ON s."audienceId" = a.id
    `;
  }

  /**
   * The WHERE conditions for a map search. findPins and findShiurim both use
   * this, so the pins and the list always agree on what counts as a match.
   * (If they didn't, you could get a pin with an empty list behind it.)
   *
   * Each optional filter adds its condition only when the user set it.
   * To add a filter: add one line here.
   */
  private searchFilters(input: MapSearchInput, radiusMeters: number) {
    return sql`
      shul."approved" = true
      AND shul."type" = 'SHUL'
      AND shul.location IS NOT NULL
      AND ST_DWithin(shul.location, ST_MakePoint(${input.lng}, ${input.lat})::geography, ${radiusMeters})
      AND o."startsAt" >= NOW()
      AND o."startsAt" <  NOW() + (${MAP_WINDOW_DAYS} * INTERVAL '1 day')
      AND o."status" <> 'CANCELLED'
      ${input.topic ? sql`AND t."name" = ${input.topic}` : NOTHING}
      ${input.language ? sql`AND l."name" = ${input.language}` : NOTHING}
      ${input.audience ? sql`AND a."name" = ${input.audience}` : NOTHING}
      ${input.dayOfWeek !== undefined ? sql`AND EXTRACT(DOW FROM ${STARTS_AT_NY}) = ${input.dayOfWeek}` : NOTHING}
      ${input.afterTime ? sql`AND ${STARTS_AT_NY}::time >= ${input.afterTime}::time` : NOTHING}
      ${input.beforeTime ? sql`AND ${STARTS_AT_NY}::time < ${input.beforeTime}::time` : NOTHING}
      ${input.q ? this.textSearch(input.q) : NOTHING}
    `;
  }

  /**
   * The search box. Matches title, shul, maggid shiur, topic and description,
   * and also allows typos: similarity() comes from the pg_trgm extension, so
   * "gemora" still finds "Gemara".
   */
  private textSearch(q: string) {
    return sql`AND (
      s."title"          ILIKE '%' || ${q} || '%'
      OR shul."name"     ILIKE '%' || ${q} || '%'
      OR rav."name"      ILIKE '%' || ${q} || '%'
      OR t."name"        ILIKE '%' || ${q} || '%'
      OR s."description" ILIKE '%' || ${q} || '%'
      OR similarity(s."title", ${q}) > 0.25
      OR similarity(COALESCE(t."name", ''), ${q}) > 0.35
    )`;
  }
}
