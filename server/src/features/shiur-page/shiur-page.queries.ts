// The SQL for the shiur popup and page (FR-9).
//
// Raw SQL for the same reason as map.queries.ts: the building's location is a
// PostGIS column Prisma can't read. This file only fetches the row; what it
// means (length, Hebrew date) is worked out in shiur-page.service.ts.

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { METERS_PER_MILE } from '../map/map.constants';

const sql = Prisma.sql;

/** One occurrence with everything about its shiur, straight from the database. */
export interface DetailsRow {
  occurrenceId: string;
  shiurId: string;
  kind: 'WEEKLY' | 'FEATURED';
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number | null;
  status: 'ON' | 'CHANGED' | 'REPORTED' | 'CANCELLED';
  reason: string | null;
  topic: string | null;
  language: string | null;
  audience: string | null;
  flyerUrl: string | null;
  shulId: string | null;
  shulName: string | null;
  shulAddress: string | null;
  maggidShiurId: string | null;
  maggidShiurName: string | null;
  room: string | null;
  lat: number | null;
  lng: number | null;
  distanceMiles: number | null;
}

@Injectable()
export class ShiurPageQueries {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One occurrence, but only if its publisher is approved (NFR-4): the shul
   * if there is one, otherwise the maggid shiur. Past and cancelled dates are
   * still returned, so an old shared link shows what happened instead of an error.
   */
  async findDetails(occurrenceId: string, lat?: number, lng?: number): Promise<DetailsRow | null> {
    // Without a starting point there's nothing to measure from.
    // Longitude first: ST_MakePoint(lng, lat).
    const distance =
      lat !== undefined && lng !== undefined
        ? sql`ST_Distance(shul.location, ST_MakePoint(${lng}, ${lat})::geography) / ${METERS_PER_MILE}`
        : sql`NULL::double precision`;

    const rows = await this.prisma.$queryRaw<DetailsRow[]>`
      SELECT
        o.id                            AS "occurrenceId",
        s.id                            AS "shiurId",
        s."kind"                        AS "kind",
        s."title"                       AS "title",
        s."description"                 AS "description",
        o."startsAt"                    AS "startsAt",
        o."endsAt"                      AS "endsAt",
        s."durationMinutes"             AS "durationMinutes",
        o."status"                      AS "status",
        o."reason"                      AS "reason",
        t."name"                        AS "topic",
        l."name"                        AS "language",
        a."name"                        AS "audience",
        s."flyerUrl"                    AS "flyerUrl",
        shul.id                         AS "shulId",
        shul."name"                     AS "shulName",
        shul."address"                  AS "shulAddress",
        rav.id                          AS "maggidShiurId",
        rav."name"                      AS "maggidShiurName",
        -- A room set on this one date overrides the shiur's usual room.
        COALESCE(ro2."name", ro."name") AS "room",
        ST_Y(shul.location::geometry)   AS "lat",
        ST_X(shul.location::geometry)   AS "lng",
        ${distance}                     AS "distanceMiles"
      FROM "Occurrence" o
      JOIN "Shiur"          s    ON o."shiurId" = s.id
      LEFT JOIN "Publisher" shul ON s."shulId" = shul.id AND shul."type" = 'SHUL'
      LEFT JOIN "Publisher" rav  ON s."maggidShiurId" = rav.id
      LEFT JOIN "Room"      ro   ON s."roomId" = ro.id
      LEFT JOIN "Room"      ro2  ON o."roomId" = ro2.id
      LEFT JOIN "Topic"     t    ON s."topicId"    = t.id
      LEFT JOIN "Language"  l    ON s."languageId" = l.id
      LEFT JOIN "Audience"  a    ON s."audienceId" = a.id
      WHERE o.id = ${occurrenceId}
        -- The shul decides if there is one; only a shiur with no shul falls
        -- back to the maggid shiur. Neither approved means hidden.
        AND COALESCE(shul."approved", rav."approved", false) = true
      LIMIT 1;
    `;
    return rows[0] ?? null;
  }
}
