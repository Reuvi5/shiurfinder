// All the database reads for the shul and maggid shiur pages (FR-10).
//
// This file only fetches rows. Labels like "New" and the address line happen
// in publishers.service.ts.
//
// Most lookups use the normal Prisma client. findUpcoming is raw SQL only
// because it needs each shul's lat/lng from the PostGIS `location` column,
// which Prisma can't read. See docs/architecture.md, "Database notes".

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { PAGE_MAX_SHIURIM, PAGE_WINDOW_DAYS } from './publishers.constants';

const sql = Prisma.sql;
const NOTHING = Prisma.empty;

// ---------------------------------------------------------------- row shapes

export interface PublisherRow {
  id: string;
  type: 'SHUL' | 'MAGGID_SHIUR';
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact: string | null;
  imageUrl: string | null;
  bio: string | null;
}

/** One upcoming date of a shiur. Same columns as the map's ListRow, minus distance. */
export interface UpcomingRow {
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
  lat: number | null;
  lng: number | null;
  shiurCreatedAt: Date;
}

// ---------------------------------------------------------------- queries

/** Whose page it is: a shul's shiurim, or a maggid shiur's (wherever they teach). */
export type Owner = { shulId: string } | { maggidShiurId: string };

@Injectable()
export class PublishersQueries {
  constructor(private readonly prisma: PrismaService) {}

  /** The publisher, but only if it is approved (NFR-4). */
  async findApprovedPublisher(id: string): Promise<PublisherRow | null> {
    return this.prisma.publisher.findFirst({
      where: { id, approved: true },
      select: {
        id: true,
        type: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        contact: true,
        imageUrl: true,
        bio: true,
      },
    });
  }

  /**
   * Dated shiurim in the next PAGE_WINDOW_DAYS, soonest first.
   *
   * Cancelled dates are included on purpose, so the page can show them as
   * Cancelled until they start. A shiur at an unapproved shul is left out, and
   * an unapproved maggid shiur's name is hidden, so neither leaks before a
   * moderator approves it (NFR-4).
   */
  async findUpcoming(owner: Owner, kind?: 'WEEKLY' | 'FEATURED'): Promise<UpcomingRow[]> {
    const ownerFilter =
      'shulId' in owner
        ? sql`s."shulId" = ${owner.shulId}`
        : sql`s."maggidShiurId" = ${owner.maggidShiurId}`;

    return this.prisma.$queryRaw<UpcomingRow[]>`
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
        ST_Y(shul.location::geometry)   AS "lat",
        ST_X(shul.location::geometry)   AS "lng",
        s."createdAt"                   AS "shiurCreatedAt"
      FROM "Occurrence" o
      JOIN "Shiur" s ON o."shiurId" = s.id
      LEFT JOIN "Publisher" shul ON s."shulId" = shul.id AND shul."approved" = true
      LEFT JOIN "Publisher" rav  ON s."maggidShiurId" = rav.id AND rav."approved" = true
      LEFT JOIN "Room"      ro   ON s."roomId" = ro.id
      LEFT JOIN "Room"      ro2  ON o."roomId" = ro2.id
      LEFT JOIN "Topic"     t    ON s."topicId" = t.id
      LEFT JOIN "Language"  l    ON s."languageId" = l.id
      WHERE ${ownerFilter}
        -- no shul, or an approved one
        AND (s."shulId" IS NULL OR shul.id IS NOT NULL)
        AND o."startsAt" >= NOW()
        AND o."startsAt" <  NOW() + (${PAGE_WINDOW_DAYS} * INTERVAL '1 day')
        ${kind ? sql`AND s."kind" = ${kind}::"ShiurKind"` : NOTHING}
      ORDER BY o."startsAt" ASC
      LIMIT ${PAGE_MAX_SHIURIM};
    `;
  }

  /** The approved shuls where this maggid shiur has shiurim coming up, A to Z. */
  async findShulsOfMaggid(maggidShiurId: string): Promise<{ id: string; name: string }[]> {
    return this.prisma.publisher.findMany({
      where: {
        type: 'SHUL',
        approved: true,
        shiurimAsShul: {
          some: {
            maggidShiurId,
            occurrences: { some: { startsAt: { gte: new Date() }, status: { not: 'CANCELLED' } } },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
