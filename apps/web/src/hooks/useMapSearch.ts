import { useQuery } from '@tanstack/react-query';
import type { MapSearchQuery, MapSearchResult } from '@shiurfinder/shared';
import { fetchMapSearch } from '../api/client';

/** SDD: the website re-checks for new data every minute. */
const REFRESH_MS = 60_000;

/**
 * The map's data. One hook so every piece of the screen — pins, Featured,
 * Weekly, the result count — reads from the same query and can never show
 * different answers to the same question.
 *
 * `location` being null means we have no point yet (no permission, nothing
 * typed), and the query simply doesn't run.
 */
export function useMapSearch(
  location: { lat: number; lng: number } | null,
  filters: Omit<MapSearchQuery, 'lat' | 'lng'>,
) {
  return useQuery<MapSearchResult>({
    queryKey: ['map-search', location?.lat, location?.lng, filters],
    queryFn: () => fetchMapSearch({ lat: location!.lat, lng: location!.lng, ...filters }),
    enabled: location !== null,
    refetchInterval: REFRESH_MS,
    // Keeps the last results on screen while a new search runs, so changing a
    // filter doesn't blank the panel (SDD, Server error alternate flow).
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  });
}
