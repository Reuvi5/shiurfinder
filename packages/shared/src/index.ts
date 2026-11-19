// The contract between the website and the server.
// Both sides import from here, so a change to the shape breaks the build
// instead of breaking the map at runtime.

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
 * Only values that at least one approved shul's shiur actually uses, so no
 * chip can lead to an empty map for a reason the user can't see.
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

/** GET /map/shul/:id/today response — the pin card in UC-1 step 11. */
export interface ShulTodayResult {
  publisherId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  shiurim: ShiurListItem[];
}

/** Every error from the server looks like this (Errors section of the SDD). */
export interface ApiError {
  code: string;
  message: string;
}
