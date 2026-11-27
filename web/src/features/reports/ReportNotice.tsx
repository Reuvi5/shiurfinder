// The "Unverified report" notice on a shiur (FR-16): what people reported,
// shown to everyone right away. Nobody has confirmed it yet, so it says so.
// ShiurInfo (the popup and the full page) shows it under the title.

import type { OccurrenceStatus } from '@shiurfinder/shared';
import { noticeReasons, noticeTitle } from './reports.format';
import { useShiurReports } from './useShiurReports';

export function ReportNotice({
  occurrenceId,
  status,
}: {
  occurrenceId: string;
  /** REPORTED with no reports to list still gets a notice. */
  status: OccurrenceStatus;
}) {
  const { data } = useShiurReports(occurrenceId);
  const reports = data?.reports ?? [];

  if (reports.length === 0 && status !== 'REPORTED') return null;
  // Nothing to say about a cancelled date: it's not happening either way.
  if (status === 'CANCELLED') return null;

  return (
    <div
      role="status"
      className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">⚠ {noticeTitle(Math.max(reports.length, 1))}</p>
      {reports.length > 0 && (
        <ul className="mt-1 list-inside list-disc">
          {noticeReasons(reports).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs opacity-80">
        Someone said this date isn’t happening. It hasn’t been confirmed yet.
      </p>
    </div>
  );
}
