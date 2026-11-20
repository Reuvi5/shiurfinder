// The shapes of the data the server and the website send each other.
//
// Both sides import from here (`import type { ... } from '@shiurfinder/shared'`),
// so if one side changes a shape, the other side's code stops compiling.
// You find out right away instead of the map silently breaking.
//
// Only types go in this file, no code that runs.

export type PublisherType = 'SHUL' | 'MAGGID_SHIUR';
export type ShiurKind = 'WEEKLY' | 'FEATURED';
export type OccurrenceStatus = 'ON' | 'CHANGED' | 'REPORTED' | 'CANCELLED';

/** GET /map/search query */
export interface MapSearchQuery {
  lat: number;
  lng: number;
  /** miles; default 10 per FR-5 */
  radiusMiles?: number;
  /** free text, matched with pg_trgm so "gemora" finds "Gemara" */
  q?: string;
  topic?: string;
  language?: string;
  audience?: string;
  /** 0 = Sunday */
  dayOfWeek?: number;
  /** "HH:mm" — only shiurim starting at or after this time of day */
  afterTime?: string;
  /** "HH:mm" — only shiurim starting before this time of day */
  beforeTime?: string;
}

/**
 * GET /map/filters response: the choices the Filters panel offers (FR-8).
 * Only values that at least one upcoming shiur actually uses, so no choice
 * leads to an empty map.
 */
export interface FilterOptions {
  topics: string[];
  languages: string[];
  audiences: string[];
}

/** One pin on the map: one shul that has upcoming shiurim. */
export interface MapPin {
  publisherId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  upcomingCount: number;
}

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
  distanceMiles: number;
  lat: number;
  lng: number;
  /** posted in the last 72 hours */
  isNew: boolean;
}

/** GET /map/search response */
export interface MapSearchResult {
  pins: MapPin[];
  featured: ShiurListItem[];
  weekly: ShiurListItem[];
  totalCount: number;
  radiusMiles: number;
}

/** GET /map/shul/:id/today response: the card that opens when a pin is clicked. */
export interface ShulTodayResult {
  publisherId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  shiurim: ShiurListItem[];
}

/** Every error from the server looks like this. See server/src/errors/error.filter.ts. */
export interface ApiError {
  code: string;
  message: string;
}
