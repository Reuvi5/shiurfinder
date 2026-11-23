// Loads one date of a shiur and shows it, with grey boxes while it loads and
// a message if it fails. ShiurCard (on the map) and ShiurPage (its own web
// address) both use this, so they load and look the same.

import { messageFor } from '../../core/api';
import { ShiurInfo } from './ShiurInfo';
import { useShiurDetails } from './useShiurDetails';

export function ShiurInfoLoader({
  occurrenceId,
  origin,
}: {
  occurrenceId: string;
  /** The search point, only used to show distance. Never saved (NFR-5). */
  origin?: { lat: number; lng: number } | null;
}) {
  const { data, isLoading, error } = useShiurDetails(occurrenceId, origin);

  if (isLoading) return <LoadingInfo />;
  // Keep showing the last details if a background refresh fails.
  if (error && !data) {
    return <p className="text-sm text-red-600 dark:text-red-400">{messageFor(error)}</p>;
  }
  return data ? <ShiurInfo details={data} /> : null;
}

/** Grey boxes shaped like the details, shown while loading. */
function LoadingInfo() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
