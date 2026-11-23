// The publisher portal's calls to the server (FR-20).

import type { NewShiur, NewShiurResult, PortalOptions } from '@shiurfinder/shared';
import { get, post } from '../../core/api';

/** The shuls, rooms, maggidei shiur and lists the form's dropdowns offer. */
export function fetchPortalOptions(): Promise<PortalOptions> {
  return get('/portal/options');
}

/** Saves a new shiur. It's on the map as soon as this returns. */
export function createShiur(shiur: NewShiur): Promise<NewShiurResult> {
  return post('/portal/shiurim', shiur);
}
