import { useQuery } from '@tanstack/react-query';
import type { FilterOptions } from '@shiurfinder/shared';
import { fetchFilterOptions } from '../api/client';

/**
 * The chips the Filters panel can show. They change only when a publisher
 * posts something with a new topic, so ten minutes of caching is plenty.
 */
export function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 10 * 60_000,
  });
}
