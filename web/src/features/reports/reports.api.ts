// Reports' calls to the server (FR-16).

import type { NewReport, ShiurReports } from '@shiurfinder/shared';
import { get, post } from '../../core/api';

/** A date's open (unverified) reports. Anyone can see them. */
export function fetchReports(occurrenceId: string): Promise<ShiurReports> {
  return get(`/reports/${occurrenceId}`);
}

/** Reports that a date isn't happening. Needs sign-in. Returns the open reports. */
export function sendReport(occurrenceId: string, report: NewReport): Promise<ShiurReports> {
  return post(`/reports/${occurrenceId}`, report);
}
