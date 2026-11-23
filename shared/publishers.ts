// Types for the shul and maggid shiur pages (FR-10).
//
// One endpoint, GET /publishers/:id, returns either page. Check `type` to know
// which one you got:
//   if (page.type === 'SHUL') { page.weekly ... } else { page.bio ... }

import type { ShiurListItem } from './common';

/** GET /publishers/:id when it's a shul. */
export interface ShulPageResult {
  type: 'SHUL';
  id: string;
  name: string;
  /** one line, e.g. "1355 Queen Anne Rd, Teaneck, NJ 07666" */
  address: string | null;
  contact: string | null;
  /** S3 key of the logo. Not shown yet: S3 isn't set up. */
  imageUrl: string | null;
  /** featured shiurim in the next 7 days, soonest first */
  featured: ShiurListItem[];
  /** weekly shiurim in the next 7 days, one row per date, soonest first. Each row has its room. */
  weekly: ShiurListItem[];
}

/** GET /publishers/:id when it's a maggid shiur. */
export interface MaggidShiurPageResult {
  type: 'MAGGID_SHIUR';
  id: string;
  name: string;
  bio: string | null;
  contact: string | null;
  /** S3 key of the photo. Not shown yet: S3 isn't set up. */
  imageUrl: string | null;
  /** the shuls where they give shiurim */
  shuls: { id: string; name: string }[];
  /** all their shiurim in the next 7 days, soonest first, including ones posted by a shul (FR-19) */
  upcoming: ShiurListItem[];
}

/** GET /publishers/:id response */
export type PublisherPageResult = ShulPageResult | MaggidShiurPageResult;
