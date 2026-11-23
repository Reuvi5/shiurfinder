// Types more than one feature uses: the basic kinds, a shiur in a list, and
// the error shape. Types only one feature uses go in that feature's own file
// (e.g. map.ts).

export type PublisherType = 'SHUL' | 'MAGGID_SHIUR';
export type ShiurKind = 'WEEKLY' | 'FEATURED';
export type OccurrenceStatus = 'ON' | 'CHANGED' | 'REPORTED' | 'CANCELLED';

/** One row in the Featured or Weekly list. */
export interface ShiurListItem {
  occurrenceId: string;
  shiurId: string;
  kind: ShiurKind;
  title: string;
  startsAt: string; // ISO 8601, UTC
  status: OccurrenceStatus;
  /** minutes until it starts; negative means it already began. null if > 24h away. */
  minutesUntilStart: number | null;
  topic: string | null;
  language: string | null;
  flyerUrl: string | null;
  shul: { id: string; name: string } | null;
  maggidShiur: { id: string; name: string } | null;
  room: string | null;
  /** miles from the search location. Missing on pages with no search location (e.g. a shul page). */
  distanceMiles?: number;
  lat: number;
  lng: number;
  /** posted in the last 72 hours */
  isNew: boolean;
}

/** Every error from the server looks like this. See server/src/core/errors/error.filter.ts. */
export interface ApiError {
  code: string;
  message: string;
}
