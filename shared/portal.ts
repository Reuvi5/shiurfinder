// Types for the publisher portal (FR-20): posting a new shiur.
//
// No teams yet (FR-18), so the form picks the shul itself, and anything typed
// in that isn't in a list (a shul, maggid shiur, room, topic, language) is
// added straight away. Once teams are built, the shul will come from the
// signed-in user's team, and new shuls and maggidei shiur will wait for a
// moderator (FR-23, NFR-4).

import type { ShiurKind } from './common';

/** One choice in a dropdown. */
export interface PortalChoice {
  id: string;
  name: string;
}

/** GET /portal/options response: everything the form's dropdowns offer. */
export interface PortalOptions {
  /** Approved shuls that have a map point, so a new shiur shows up on the map. */
  shuls: (PortalChoice & { address: string | null; rooms: PortalChoice[] })[];
  maggideiShiur: PortalChoice[];
  topics: PortalChoice[];
  languages: PortalChoice[];
  audiences: PortalChoice[];
}

/**
 * A dropdown you can also type in: pick an existing one by id, or type a
 * name that isn't in the list, and the server adds it.
 */
export type PickOrNew = { id: string } | { name: string };

/** A shul that isn't in the list yet. lat/lng come from the address search, so it gets a pin. */
export interface NewShul {
  name: string;
  /** one line, e.g. "950 Queen Anne Rd, Teaneck, NJ 07666" */
  address: string;
  lat: number;
  lng: number;
}

/** What every new shiur has, weekly or featured. */
interface NewShiurBase {
  kind: ShiurKind;
  title: string;
  description?: string;
  shul: { id: string } | NewShul;
  maggidShiur?: PickOrNew;
  /** an existing room must be the shul's own; a new name adds it to the shul */
  room?: PickOrNew;
  topic?: PickOrNew;
  language?: PickOrNew;
  audienceId?: string;
  /** New York time, 24-hour "HH:mm", e.g. "20:00" */
  startTime: string;
  durationMinutes?: number;
}

/** POST /portal/shiurim body. */
export type NewShiur =
  | (NewShiurBase & { kind: 'WEEKLY'; /** 0 = Sunday */ daysOfWeek: number[] })
  | (NewShiurBase & { kind: 'FEATURED'; /** New York date, "YYYY-MM-DD" */ date: string });

/** POST /portal/shiurim response. */
export interface NewShiurResult {
  shiurId: string;
  /** the soonest date, for the "Open the shiur page" link */
  firstOccurrenceId: string;
  /** how many dates were created (a weekly shiur gets 8 weeks of them) */
  occurrenceCount: number;
}
