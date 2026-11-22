// The map's calls to the server (FR-5).

import type {
  FilterOptions,
  MapSearchQuery,
  MapSearchResult,
  ShulTodayResult,
} from '@shiurfinder/shared';
import { get } from '../../core/api';

/** Pins plus the Weekly and Featured lists for one search. */
export function fetchMapSearch(query: MapSearchQuery): Promise<MapSearchResult> {
  return get('/map/search', { ...query });
}

/** The choices the Filters panel can offer. */
export function fetchFilterOptions(): Promise<FilterOptions> {
  return get('/map/filters');
}

/** One shul's shiurim for the rest of today. `origin` is only used to show distance. */
export function fetchShulToday(
  publisherId: string,
  origin?: { lat: number; lng: number },
): Promise<ShulTodayResult> {
  return get(`/map/shul/${publisherId}/today`, { lat: origin?.lat, lng: origin?.lng });
}
