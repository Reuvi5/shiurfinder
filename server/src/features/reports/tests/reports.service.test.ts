// ReportsService with fake queries (FR-16): what a report saves, when a date
// can no longer be reported, and what the notice gets. The SQL and the whole
// request are tested in reports.controller.db.test.ts.

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { OpenReportRow, ReportableDate, ReportsQueries } from '../reports.queries';
import { endOf, reasonText, ReportsService } from '../reports.service';

const NOW = new Date('2026-12-01T01:00:00Z'); // 8pm in New York

/** A date that started `minutesAgo` before NOW. */
function dateStarted(minutesAgo: number, more: Partial<ReportableDate> = {}): ReportableDate {
  return {
    occurrenceId: 'occ-1',
    status: 'ON',
    startsAt: new Date(NOW.getTime() - minutesAgo * 60_000),
    endsAt: null,
    durationMinutes: 60,
    ...more,
  };
}

/** A fake database with one date (or none). `saved` shows what create() was given. */
function serviceWith(world: {
  date?: ReportableDate | null;
  alreadyReported?: boolean;
  open?: OpenReportRow[];
}) {
  const saved: { occurrenceId: string; userId: string; reason: string }[] = [];
  const queries = {
    findDate: async () => (world.date === undefined ? dateStarted(-120) : world.date),
    hasOpenReport: async () => world.alreadyReported ?? false,
    create: async (occurrenceId: string, userId: string, reason: string) => {
      saved.push({ occurrenceId, userId, reason });
    },
    findOpenReports: async () => world.open ?? [],
  } as unknown as ReportsQueries;
  return { service: new ReportsService(queries), saved };
}

describe('FR-16 sending a report', () => {
  it('saves the reason as text and returns the open reports', async () => {
    const open = [{ reason: 'Shul closed', createdAt: NOW }];
    const { service, saved } = serviceWith({ open });

    const result = await service.report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW);

    expect(saved).toEqual([{ occurrenceId: 'occ-1', userId: 'user-1', reason: 'Shul closed' }]);
    expect(result).toEqual({
      occurrenceId: 'occ-1',
      reports: [{ reason: 'Shul closed', reportedAt: NOW.toISOString() }],
    });
  });

  it('saves the write-in with Other', async () => {
    const { service, saved } = serviceWith({});

    await service.report('occ-1', 'user-1', { reason: 'OTHER', details: 'In the shul hall' }, NOW);

    expect(saved[0]?.reason).toBe('Other: In the shul hall');
  });

  it('takes a report for a date that was changed by the publisher', async () => {
    const { service, saved } = serviceWith({ date: dateStarted(-60, { status: 'CHANGED' }) });

    await service.report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW);

    expect(saved).toHaveLength(1);
  });

  it('takes a second report for a date someone else already reported', async () => {
    const { service, saved } = serviceWith({ date: dateStarted(-60, { status: 'REPORTED' }) });

    await service.report('occ-1', 'user-2', { reason: 'SHUL_CLOSED' }, NOW);

    expect(saved).toHaveLength(1);
  });

  it('refuses a date that is missing or unapproved, with the same 404 (NFR-4)', async () => {
    const { service, saved } = serviceWith({ date: null });

    await expect(
      service.report('nope', 'user-1', { reason: 'SHUL_CLOSED' }, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(saved).toEqual([]);
  });

  it('refuses a date that is already cancelled', async () => {
    const { service, saved } = serviceWith({ date: dateStarted(-60, { status: 'CANCELLED' }) });

    const error = await service
      .report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'ALREADY_CANCELLED',
    });
    expect(saved).toEqual([]);
  });

  it('refuses a second open report from the same person', async () => {
    const { service, saved } = serviceWith({ alreadyReported: true });

    await expect(
      service.report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(saved).toEqual([]);
  });
});

describe('FR-16 how late a date can be reported', () => {
  it('takes a report 1 minute before a 60-minute shiur ends (59 minutes in)', async () => {
    const { service, saved } = serviceWith({ date: dateStarted(59) });

    await service.report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW);

    expect(saved).toHaveLength(1);
  });

  it('refuses one the minute it ends, and after (60 and 61 minutes in)', async () => {
    for (const minutesIn of [60, 61]) {
      const { service, saved } = serviceWith({ date: dateStarted(minutesIn) });

      const error = await service
        .report('occ-1', 'user-1', { reason: 'SHUL_CLOSED' }, NOW)
        .catch((e: unknown) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: 'REPORT_TOO_LATE',
      });
      expect(saved).toEqual([]);
    }
  });

  it('uses the date’s own end time over the usual length', () => {
    const endsAt = new Date(NOW.getTime() + 5 * 60_000);
    expect(endOf(dateStarted(200, { endsAt }))).toEqual(endsAt);
  });

  it('counts a shiur with no length as 60 minutes long', () => {
    const date = dateStarted(0, { durationMinutes: null });
    expect(endOf(date)).toEqual(new Date(NOW.getTime() + 60 * 60_000));
  });

  it('uses the shiur’s own length', () => {
    const date = dateStarted(0, { durationMinutes: 45 });
    expect(endOf(date)).toEqual(new Date(NOW.getTime() + 45 * 60_000));
  });
});

describe('FR-16 the unverified report notice', () => {
  it('lists the open reports, newest first as the database gives them', async () => {
    const older = new Date('2026-11-30T20:00:00Z');
    const { service } = serviceWith({
      open: [
        { reason: 'Other: Moved upstairs', createdAt: NOW },
        { reason: 'Shul closed', createdAt: older },
      ],
    });

    expect(await service.list('occ-1')).toEqual({
      occurrenceId: 'occ-1',
      reports: [
        { reason: 'Other: Moved upstairs', reportedAt: NOW.toISOString() },
        { reason: 'Shul closed', reportedAt: older.toISOString() },
      ],
    });
  });

  it('gives an empty list when nobody reported it', async () => {
    const { service } = serviceWith({ open: [] });

    expect((await service.list('occ-1')).reports).toEqual([]);
  });

  it('shows a report saved with no reason as Other', async () => {
    const { service } = serviceWith({ open: [{ reason: null, createdAt: NOW }] });

    expect((await service.list('occ-1')).reports[0]?.reason).toBe('Other');
  });

  it('hides the reports of a date that is missing or unapproved (NFR-4)', async () => {
    const { service } = serviceWith({ date: null });

    await expect(service.list('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('FR-16 reason text', () => {
  it('writes each reason the way the notice shows it', () => {
    expect(reasonText({ reason: 'MAGGID_SHIUR_UNAVAILABLE' })).toBe('Maggid shiur unavailable');
    expect(reasonText({ reason: 'SHUL_CLOSED' })).toBe('Shul closed');
    expect(reasonText({ reason: 'OTHER', details: 'Moved' })).toBe('Other: Moved');
  });

  it('ignores a write-in sent with a reason other than Other', () => {
    expect(reasonText({ reason: 'SHUL_CLOSED', details: 'flooded' })).toBe('Shul closed');
  });
});
