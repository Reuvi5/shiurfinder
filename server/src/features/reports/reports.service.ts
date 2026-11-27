// The logic behind reporting that a shiur date isn't happening (FR-16).
//
// Checks the date can be reported, saves the report as text ("Shul closed",
// "Other: moved to the social hall"), and lists the open ones. No SQL here.
//
// For now any signed-in user can report. The SRS limits it to people who
// saved the shiur or follow its shul or maggid shiur; that comes with saves
// and follows (FR-11, FR-12). Confirming or dismissing a report, and alerting
// the publisher, come with teams and alerts (FR-18, FR-15).

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ShiurReports } from '@shiurfinder/shared';
import { DEFAULT_LENGTH_MINUTES, REASON_TEXT } from './reports.constants';
import { ReportsQueries, type ReportableDate } from './reports.queries';
import type { NewReportInput } from './reports.validation';

@Injectable()
export class ReportsService {
  constructor(private readonly queries: ReportsQueries) {}

  /** A date's open reports, for the "unverified report" notice. Anyone can see them (FR-1). */
  async list(occurrenceId: string): Promise<ShiurReports> {
    await this.findDate(occurrenceId);
    return this.openReports(occurrenceId);
  }

  /**
   * Saves one user's report and marks the date reported. Everyone sees it
   * right away (FR-16, Output). Returns the date's open reports.
   */
  async report(
    occurrenceId: string,
    userId: string,
    input: NewReportInput,
    now: Date = new Date(),
  ): Promise<ShiurReports> {
    const date = await this.findDate(occurrenceId);

    if (date.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'ALREADY_CANCELLED',
        message: 'This date is already cancelled.',
      });
    }
    if (endOf(date).getTime() <= now.getTime()) {
      throw new BadRequestException({
        code: 'REPORT_TOO_LATE',
        message: 'This date is over, so it can no longer be reported.',
      });
    }
    // One open report per person per date, so one user can't pile them up.
    if (await this.queries.hasOpenReport(occurrenceId, userId)) {
      throw new ConflictException({
        code: 'ALREADY_REPORTED',
        message: 'You already reported this date.',
      });
    }

    await this.queries.create(occurrenceId, userId, reasonText(input));
    return this.openReports(occurrenceId);
  }

  /** The date, or 404 for one that's missing or unapproved: they look the same (NFR-4). */
  private async findDate(occurrenceId: string): Promise<ReportableDate> {
    const date = await this.queries.findDate(occurrenceId);
    if (!date) {
      throw new NotFoundException({
        code: 'SHIUR_NOT_FOUND',
        message: 'That shiur could not be found.',
      });
    }
    return date;
  }

  private async openReports(occurrenceId: string): Promise<ShiurReports> {
    const rows = await this.queries.findOpenReports(occurrenceId);
    return {
      occurrenceId,
      reports: rows.map((row) => ({
        reason: row.reason ?? REASON_TEXT.OTHER,
        reportedAt: row.createdAt.toISOString(),
      })),
    };
  }
}

// ---------------------------------------------------------------- helpers

/** What's saved in Report.reason, e.g. "Shul closed" or "Other: moved to the social hall". */
export function reasonText(input: NewReportInput): string {
  const text = REASON_TEXT[input.reason];
  return input.reason === 'OTHER' ? `${text}: ${input.details}` : text;
}

/**
 * When a date stops counting as "still going": its own end time, otherwise its
 * start plus its length (or the default). A shiur that's under way can still
 * be reported, e.g. by someone who came and found nobody there.
 */
export function endOf(date: ReportableDate): Date {
  if (date.endsAt) return date.endsAt;
  const minutes = date.durationMinutes ?? DEFAULT_LENGTH_MINUTES;
  return new Date(date.startsAt.getTime() + minutes * 60_000);
}
