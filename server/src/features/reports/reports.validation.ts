// The rules for what a report is allowed to contain (FR-16).
//
// Whether the date exists, is approved and can still be reported is checked in
// reports.service.ts, since that needs the database.

import { z } from 'zod';
import { MAX_DETAILS_LENGTH } from './reports.constants';

/** POST /reports/:occurrenceId */
export const newReportSchema = z
  .object({
    reason: z.enum(['MAGGID_SHIUR_UNAVAILABLE', 'SHUL_CLOSED', 'OTHER']),
    details: z
      .string()
      .trim()
      .max(MAX_DETAILS_LENGTH)
      .optional()
      .transform((value) => value || undefined),
  })
  // "Other" on its own tells nobody anything.
  .refine((report) => report.reason !== 'OTHER' || report.details !== undefined, {
    message: 'Say what is going on',
    path: ['details'],
  });

export type NewReportInput = z.infer<typeof newReportSchema>;
