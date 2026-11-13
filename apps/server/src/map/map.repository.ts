import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MapSearchDto } from './dto/map-search.dto';
import {
  MAP_WINDOW_DAYS,
  METERS_PER_MILE,
  type ListRow,
  type PinRow,
  type MapRepositoryPort,
} from './map.types';

const sql = Prisma.sql;
const EMPTY = Prisma.empty;

/**
 * Data access for the map. Knows SQL and nothing else — no labels, no badges,
 * no formatting. Those are rules, and rules live in MapService.
 *
 * Implements MapRepositoryPort so MapService depends on the interface rather
 * than on this class (dependency inversion). That also lets the service be
 * tested against a fake repository with no database running.
 */
@Injectable()
export class MapRepository implements MapRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** One row per approved shul within the radius that has upcoming shiurim. */
  async findPins(dto: MapSearchDto, radiusMeters: number): Promise<PinRow[]> {
    return this.prisma.$queryRaw<PinRow[]>`
      SELECT
        shul.id                                                AS "publisherId",
        shul."name"                                            AS "name",
        ST_Y(shul.location::geometry)                          AS "lat",
        ST_X(shul.location::geometry)                          AS "lng",
        ST_Distance(shul.location, ST_MakePoint(${dto.lng}, ${dto.lat})::geography)
          / ${METERS_PER_MILE}                                 AS "distanceMiles",
        COUNT(DISTINCT o.id)                                   AS "upcomingCount"
      FROM "Publisher" shul
      JOIN "Shiur"      s ON s."shulId" = shul.id
      JOIN "Occurrence" o ON o."shiurId" = s.id
      LEFT JOIN "Publisher" rav ON s."maggidShiurId" = rav.id
      LEFT JOIN "Topic"     t   ON s."topicId"    = t.id
      LEFT JOIN "Language"  l   ON s."languageId" = l.id
      WHERE ${this.baseWhere(dto, radiusMeters)}
      GROUP BY shul.id, shul."name", shul.location
      ORDER BY "distanceMiles" ASC
      LIMIT 300;
    `;
  }

  /** The rows behind the Featured and Weekly tabs. */
  async findShiurim(dto: MapSearchDto, radiusMeters: number): Promise<ListRow[]> {
    return this.prisma.$queryRaw<ListRow[]>`
      ${this.listSelect(
        sql`ST_Distance(shul.location, ST_MakePoint(${dto.lng}, ${dto.lat})::geography)
            / ${METERS_PER_MILE}`,
      )}
      WHERE ${this.baseWhere(dto, radiusMeters)}
      ORDER BY o."startsAt" ASC, "distanceMiles" ASC
      LIMIT 500;
    `;
  }

  /** That shul's remaining shiurim for today, New York time. */
  async findShulToday(publisherId: string, lat?: number, lng?: number): Promise<ListRow[]> {
    const distance =
      lat !== undefined && lng !== undefined
        ? sql`ST_Distance(shul.location, ST_MakePoint(${lng}, ${lat})::geography) / ${METERS_PER_MILE}`
        : sql`0::double precision`;

    return this.prisma.$queryRaw<ListRow[]>`
      ${this.listSelect(distance)}
      WHERE shul.id = ${publisherId}
        AND o."startsAt" >= NOW()
        AND (o."startsAt" AT TIME ZONE 'America/New_York')::date
            = (NOW() AT TIME ZONE 'America/New_York')::date
      ORDER BY o."startsAt" ASC;
    `;
  }

  async findApprovedShul(
    publisherId: string,
  ): Promise<{ id: string; name: string; address: string | null } | null> {
    return this.prisma.publisher.findFirst({
      where: { id: publisherId, approved: true, type: 'SHUL' },
      select: { id: true, name: true, address: true },
    });
  }

  // ---------------------------------------------------------------- fragments

  /**
   * SELECT + FROM + JOINs shared by every query that returns ListRow.
   * Written once so the three callers can't drift apart; the distance
   * expression is the only part that varies.
   */
  private listSelect(distanceExpr: Prisma.Sql) {
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
        COALESCE(ro2."name", ro."name") AS "room",
        ${distanceExpr}                 AS "distanceMiles",
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
    `;
  }

  /**
   * Everything the pin query and the list query filter on. Shared so the pins
   * and the list can never disagree about what counts as nearby — otherwise
   * you get a pin on the map with an empty list behind it.
   *
   * Every filter is its own method: adding "audience" is a new clause, not an
   * edit to this one (open/closed).
   */
  private baseWhere(dto: MapSearchDto, radiusMeters: number) {
    return sql`
      shul."approved" = true
      AND shul."type" = 'SHUL'
      AND shul.location IS NOT NULL
      AND ST_DWithin(shul.location, ST_MakePoint(${dto.lng}, ${dto.lat})::geography, ${radiusMeters})
      AND o."startsAt" >= NOW()
      AND o."startsAt" <  NOW() + (${MAP_WINDOW_DAYS} * INTERVAL '1 day')
      AND o."status" <> 'CANCELLED'
      ${this.topicClause(dto)}
      ${this.languageClause(dto)}
      ${this.dayClause(dto)}
      ${this.afterTimeClause(dto)}
      ${this.textClause(dto)}
    `;
  }

  private topicClause(dto: MapSearchDto) {
    return dto.topic ? sql`AND t."name" = ${dto.topic}` : EMPTY;
  }

  private languageClause(dto: MapSearchDto) {
    return dto.language ? sql`AND l."name" = ${dto.language}` : EMPTY;
  }

  /** Day of week in New York time, 0 = Sunday, matching the filter chips. */
  private dayClause(dto: MapSearchDto) {
    return dto.dayOfWeek === undefined
      ? EMPTY
      : sql`AND EXTRACT(DOW FROM (o."startsAt" AT TIME ZONE 'America/New_York')) = ${dto.dayOfWeek}`;
  }

  /** "I'm free after 8pm" — compares time of day, not date. */
  private afterTimeClause(dto: MapSearchDto) {
    return dto.afterTime === undefined
      ? EMPTY
      : sql`AND (o."startsAt" AT TIME ZONE 'America/New_York')::time >= ${dto.afterTime}::time`;
  }

  /**
   * Typo-tolerant search (SDD: pg_trgm, so "gemora" still finds "Gemara").
   * similarity() needs pg_trgm, enabled in the first migration.
   */
  private textClause(dto: MapSearchDto) {
    if (!dto.q) return EMPTY;
    return sql`AND (
      s."title"      ILIKE '%' || ${dto.q} || '%'
      OR shul."name" ILIKE '%' || ${dto.q} || '%'
      OR rav."name"  ILIKE '%' || ${dto.q} || '%'
      OR t."name"    ILIKE '%' || ${dto.q} || '%'
      OR similarity(s."title", ${dto.q}) > 0.25
      OR similarity(COALESCE(t."name", ''), ${dto.q}) > 0.35
    )`;
  }
}
