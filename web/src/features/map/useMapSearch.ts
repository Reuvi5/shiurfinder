// Runs a map search and keeps it fresh.
//
// Everything on the map screen (pins, both tabs, the result count) reads from
// this one search, so they always agree.
// While `location` is null (no permission yet, nothing typed) it waits.

import { useQuery } from '@tanstack/react-query';
import type { MapSearchQuery, MapSearchResult } from '@shiurfinder/shared';
import { fetchMapSearch } from '../../api';

/** Re-check the server for changes every minute. */
const REFRESH_MS = 60_000;

export function useMapSearch(
  location: { lat: number; lng: number } | null,
  filters: Omit<MapSearchQuery, 'lat' | 'lng'>,
  /**
   * live: false is for the Filters panel's preview count, which doesn't need
   * to refresh every minute.
   */
  { live = true }: { live?: boolean } = {},
) {
  return useQuery<MapSearchResult>({
    // The cache key. The same search always gives the same key, so it is only
    // fetched once. (Filters set to undefined don't change the key.)
    queryKey: ['map-search', location?.lat, location?.lng, filters],
    queryFn: () => fetchMapSearch({ lat: location!.lat, lng: location!.lng, ...filters }),
    enabled: location !== null,
    refetchInterval: live ? REFRESH_MS : false,
    // Keep showing the old results while a new search loads, instead of a blank panel.
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  });
}
