// Types for the map home screen (FR-5): search, filters, pins, the shul card.

import type { ShiurListItem } from './common';

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
