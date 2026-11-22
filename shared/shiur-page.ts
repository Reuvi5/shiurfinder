// Types for the shiur popup and page (FR-9): one date of a shiur, with
// everything needed to decide whether to go.

import type { OccurrenceStatus, ShiurKind } from './common';

/** GET /shiur-page/:occurrenceId query. lat/lng are optional; they're only used for distance. */
export interface ShiurDetailsQuery {
  lat?: number;
  lng?: number;
}

/** GET /shiur-page/:occurrenceId response. */
export interface ShiurDetails {
  occurrenceId: string;
  shiurId: string;
  kind: ShiurKind;
  title: string;
  description: string | null;
  startsAt: string; // ISO 8601, UTC
  /** e.g. "2 Cheshvan", for the date the shiur is on in New York */
  hebrewDate: string;
  /** null if the publisher didn't give one */
  lengthMinutes: number | null;
  status: OccurrenceStatus;
  /** why it changed or was cancelled, if the publisher said */
  reason: string | null;
  topic: string | null;
  language: string | null;
  audience: string | null;
  flyerUrl: string | null;
  /** the building. null for a maggid shiur's shiur with no shul. */
  shul: { id: string; name: string; address: string | null } | null;
  maggidShiur: { id: string; name: string } | null;
  room: string | null;
  /** null when the building has no map point */
  lat: number | null;
  lng: number | null;
  /** null when no starting point was sent, or the building has no map point */
  distanceMiles: number | null;
}
