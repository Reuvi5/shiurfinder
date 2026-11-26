// The SQL for reports (FR-16).
//
// This file only reads and writes rows. Whether a date can be reported (too
// late, cancelled, reported twice) is decided in reports.service.ts.

import { Injectable } from '@nestjs/common';
import type { OccurrenceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

/** The parts of a date that decide whether it can be reported. */
export interface ReportableDate {
  occurrenceId: string;
  status: OccurrenceStatus;
  startsAt: Date;
  endsAt: Date | null;
  durationMinutes: number | null;
}

/** One open report, as stored. */
export interface OpenReportRow {
  reason: string | null;
  createdAt: Date;
}

@Injectable()
export class ReportsQueries {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One date, but only if its publisher is approved (NFR-4): the shul if there
   * is one, otherwise the maggid shiur. Same rule as shiur-page.queries.ts.
   */
  async findDate(occurrenceId: string): Promise<ReportableDate | null> {
    const rows = await this.prisma.$queryRaw<ReportableDate[]>`
      SELECT
        o.id                AS "occurrenceId",
        o."status"          AS "status",
        o."startsAt"        AS "startsAt",
        o."endsAt"          AS "endsAt",
        s."durationMinutes" AS "durationMinutes"
      FROM "Occurrence" o
      JOIN "Shiur"          s    ON o."shiurId" = s.id
      LEFT JOIN "Publisher" shul ON s."shulId" = shul.id AND shul."type" = 'SHUL'
      LEFT JOIN "Publisher" rav  ON s."maggidShiurId" = rav.id
      WHERE o.id = ${occurrenceId}
        AND COALESCE(shul."approved", rav."approved", false) = true
      LIMIT 1;
    `;
    return rows[0] ?? null;
  }

  /** True if this user already has an open report on this date. */
  async hasOpenReport(occurrenceId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.report.count({
      where: { occurrenceId, reportedById: userId, status: 'OPEN' },
    });
    return count > 0;
  }

  /**
   * Saves the report and marks the date reported, together. Only a date that
   * is ON changes: a CHANGED one keeps the publisher's own change note.
   */
  async create(occurrenceId: string, userId: string, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.report.create({ data: { occurrenceId, reportedById: userId, reason } }),
      this.prisma.occurrence.updateMany({
        where: { id: occurrenceId, status: 'ON' },
        data: { status: 'REPORTED' },
      }),
    ]);
  }

  /** The date's open reports, newest first. Who sent them isn't read (NFR-5). */
  async findOpenReports(occurrenceId: string): Promise<OpenReportRow[]> {
    return this.prisma.report.findMany({
      where: { occurrenceId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      select: { reason: true, createdAt: true },
    });
  }
}
