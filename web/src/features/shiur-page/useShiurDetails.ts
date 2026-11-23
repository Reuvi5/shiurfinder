// Loads one date of a shiur and keeps it fresh. Used by both the popup and
// the full page, so they share one cached request.

import { useQuery } from '@tanstack/react-query';
import type { ShiurDetails } from '@shiurfinder/shared';
import { fetchShiurDetails } from './shiur-page.api';

/** Re-check every minute, so a cancellation shows up without a refresh (design doc). */
const REFRESH_MS = 60_000;

export function useShiurDetails(
  occurrenceId: string,
  origin?: { lat: number; lng: number } | null,
) {
  return useQuery<ShiurDetails>({
    queryKey: ['shiur-details', occurrenceId, origin?.lat, origin?.lng],
    queryFn: () => fetchShiurDetails(occurrenceId, origin),
    refetchInterval: REFRESH_MS,
    // When only the starting point changes (e.g. the full page learns the
    // user's location a moment later), keep showing the details instead of
    // grey boxes. Never for a different shiur, or it would flash the old one.
    placeholderData: (previous) => (previous?.occurrenceId === occurrenceId ? previous : undefined),
    staleTime: 30_000,
    retry: 1,
  });
}
