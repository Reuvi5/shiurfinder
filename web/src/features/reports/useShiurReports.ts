// Loads a date's open reports and keeps them fresh (FR-16), for ReportNotice.
// After a report is sent, ReportButton refreshes every cached request.

import { useQuery } from '@tanstack/react-query';
import type { ShiurReports } from '@shiurfinder/shared';
import { fetchReports } from './reports.api';

/** Re-check every minute, like the shiur details, so new reports show without a refresh. */
const REFRESH_MS = 60_000;

export function useShiurReports(occurrenceId: string) {
  return useQuery<ShiurReports>({
    queryKey: ['shiur-reports', occurrenceId],
    queryFn: () => fetchReports(occurrenceId),
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
    retry: 1,
  });
}
