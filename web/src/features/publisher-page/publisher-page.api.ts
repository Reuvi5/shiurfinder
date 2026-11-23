// The shul and maggid shiur pages' calls to the server (FR-10).

import type { PublisherPageResult } from '@shiurfinder/shared';
import { get } from '../../core/api';

/** A shul's or maggid shiur's page. Check `type` in the reply to know which. */
export function fetchPublisherPage(id: string): Promise<PublisherPageResult> {
  return get(`/publishers/${encodeURIComponent(id)}`);
}
