// The words reporting shows (FR-16): the three reasons, the "unverified
// report" notice, and whether a date can still be reported. No components
// here, see ReportButton.tsx and ReportNotice.tsx.

import type { OpenReport, ReportReason, ShiurDetails } from '@shiurfinder/shared';

/** The SRS's three reasons, in the order the form lists them. */
export const REASON_CHOICES: { reason: ReportReason; label: string }[] = [
  { reason: 'MAGGID_SHIUR_UNAVAILABLE', label: 'Maggid shiur unavailable' },
  { reason: 'SHUL_CLOSED', label: 'Shul closed' },
  { reason: 'OTHER', label: 'Other' },
];

/**
 * A date with no length counts as 60 minutes, the same as the server
 * (reports.constants.ts), so the button and the server agree on "too late".
 */
const DEFAULT_LENGTH_MINUTES = 60;

/** "Unverified report", or "3 unverified reports". */
export function noticeTitle(count: number): string {
  return count === 1 ? 'Unverified report' : `${count} unverified reports`;
}

/**
 * Each reason once, newest first, with how many sent it when more than one:
 * ["Shul closed (2)", "Other: moved upstairs"]. The list comes newest first.
 */
export function noticeReasons(reports: OpenReport[]): string[] {
  const counts = new Map<string, number>();
  for (const report of reports) counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1);
  return [...counts].map(([reason, count]) => (count > 1 ? `${reason} (${count})` : reason));
}

/**
 * Whether the Report button is offered. Not for a cancelled date, or one that
 * is over; a shiur that's under way can still be reported.
 */
export function canReport(details: ShiurDetails, now: number): boolean {
  if (details.status === 'CANCELLED') return false;
  const minutes = details.lengthMinutes ?? DEFAULT_LENGTH_MINUTES;
  return now < new Date(details.startsAt).getTime() + minutes * 60_000;
}
