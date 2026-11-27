// Types for reporting that a shiur date isn't happening (FR-16).
//
// Reports aren't checked by anyone yet, so the website shows each one as an
// "unverified report". Later the publisher will confirm (cancels the date)
// or dismiss it.

/** Why it isn't happening: the SRS's three reasons (FR-16, Input). */
export type ReportReason = 'MAGGID_SHIUR_UNAVAILABLE' | 'SHUL_CLOSED' | 'OTHER';

/** POST /reports/:occurrenceId body. Needs sign-in. */
export interface NewReport {
  reason: ReportReason;
  /** what's going on, in the user's words. Needed for OTHER, ignored otherwise. */
  details?: string;
}

/** One open (not yet confirmed or dismissed) report. Who sent it is never shown. */
export interface OpenReport {
  /** e.g. "Shul closed", or "Other: moved to the social hall" */
  reason: string;
  reportedAt: string; // ISO 8601, UTC
}

/** GET /reports/:occurrenceId response, and POST's too. */
export interface ShiurReports {
  occurrenceId: string;
  /** newest first */
  reports: OpenReport[];
}
