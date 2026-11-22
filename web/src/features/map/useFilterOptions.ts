// The choices for the Filters panel (topics, languages, audiences).
// These rarely change, so they're cached for 10 minutes.

import { useQuery } from '@tanstack/react-query';
import type { FilterOptions } from '@shiurfinder/shared';
import { fetchFilterOptions } from '../../api';

export function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 10 * 60_000,
  });
}
