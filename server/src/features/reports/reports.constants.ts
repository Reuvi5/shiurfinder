// Fixed values reporting uses (FR-16). Change them here, not inline.

import type { ReportReason } from '@shiurfinder/shared';

/** The words saved in Report.reason for each choice. OTHER adds ": <details>". */
export const REASON_TEXT: Record<ReportReason, string> = {
  MAGGID_SHIUR_UNAVAILABLE: 'Maggid shiur unavailable',
  SHUL_CLOSED: 'Shul closed',
  OTHER: 'Other',
};

/** Longest write-in for OTHER. */
export const MAX_DETAILS_LENGTH = 300;

/**
 * How long a date counts as still going when it has no length, for "can it
 * still be reported?". Matches the 60-minute default in schema.prisma.
 */
export const DEFAULT_LENGTH_MINUTES = 60;
