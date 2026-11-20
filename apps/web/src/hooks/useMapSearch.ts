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
  options: {
    /**
     * false for the Filters panel's "Show N shiurim" preview: it only needs the
     * count while the panel is open, not a refresh every minute. Same query key
     * as the real search, so applying the filters reuses the cached answer.
     */
    live?: boolean;
    enabled?: boolean;
  } = {},
) {
  const { live = true, enabled = true } = options;

  return useQuery<MapSearchResult>({
    // Undefined filter values drop out of the key, so {} and {topic: undefined}
    // share one cache entry.
    queryKey: ['map-search', location?.lat, location?.lng, filters],
    queryFn: () => fetchMapSearch({ lat: location!.lat, lng: location!.lng, ...filters }),
    enabled: enabled && location !== null,
    refetchInterval: live ? REFRESH_MS : false,
    // Keeps the last results on screen while a new search runs, so changing a
    // filter doesn't blank the panel (SDD, Server error alternate flow).
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  });
}
