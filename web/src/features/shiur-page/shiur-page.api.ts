// The shiur page's calls to the server (FR-9).

import type { ShiurDetails } from '@shiurfinder/shared';
import { get } from '../../core/api';

/** One date of a shiur. `origin` is only used to show distance. */
export function fetchShiurDetails(
  occurrenceId: string,
  origin?: { lat: number; lng: number } | null,
): Promise<ShiurDetails> {
  return get(`/shiur-page/${occurrenceId}`, { lat: origin?.lat, lng: origin?.lng });
}
