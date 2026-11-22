// The logic behind the map screen.
//
// Asks map.queries.ts for raw rows, then turns them into what the website
// shows: which tab each shiur goes in, whether it's "New", how many minutes
// until it starts. No SQL in this file.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  FilterOptions,
  MapPin,
  MapSearchResult,
  ShiurListItem,
  ShulTodayResult,
} from '@shiurfinder/shared';
import {
  BADGE_WINDOW_MINUTES,
  DEFAULT_RADIUS_MILES,
  METERS_PER_MILE,
  NEW_LABEL_HOURS,
} from './map.constants';
import { MapQueries, type ListRow, type PinRow } from './map.queries';
import type { MapSearchInput } from './map.validation';

@Injectable()
export class MapService {
  constructor(private readonly queries: MapQueries) {}

  /**
   * The main search: pins for the map plus the Weekly and Featured lists.
   *
   * The user's location is only used for this query. It is never saved anywhere (NFR-5).
   */
  async search(input: MapSearchInput): Promise<MapSearchResult> {
    const radiusMiles = input.radiusMiles ?? DEFAULT_RADIUS_MILES;
    const radiusMeters = radiusMiles * METERS_PER_MILE;

    // The two queries don't depend on each other, so they run at the same time.
    const [pinRows, listRows] = await Promise.all([
      this.queries.findPins(input, radiusMeters),
      this.queries.findShiurim(input, radiusMeters),
    ]);

    const now = Date.now();
    const items = listRows.map((row) => toListItem(row, now));

    return {
      pins: pinRows.map(toPin),
      featured: items.filter((item) => item.kind === 'FEATURED'),
      weekly: items.filter((item) => item.kind === 'WEEKLY'),
      totalCount: items.length,
      radiusMiles,
    };
  }

  /** The card that opens when a pin is clicked: that shul's shiurim for the rest of today. */
  async shulToday(publisherId: string, lat?: number, lng?: number): Promise<ShulTodayResult> {
    const shul = await this.queries.findApprovedShul(publisherId);

    // An unapproved shul gets the same "not found" as a missing one, so nobody
    // can find out it exists before a moderator approves it (NFR-4).
    if (!shul) {
      throw new NotFoundException({
        code: 'SHUL_NOT_FOUND',
        message: 'That shul could not be found.',
      });
    }

    const rows = await this.queries.findShulToday(publisherId, lat, lng);
    const now = Date.now();
    const shiurim = rows.map((row) => toListItem(row, now));

    return {
      publisherId: shul.id,
      name: shul.name,
      address: shul.address,
      lat: shiurim[0]?.lat ?? 0,
      lng: shiurim[0]?.lng ?? 0,
      shiurim,
    };
  }

  /** The choices for the Filters panel, split into their three groups. */
  async filterOptions(): Promise<FilterOptions> {
    const rows = await this.queries.findFilterOptions();
    const namesOf = (kind: 'topic' | 'language' | 'audience') =>
      rows.filter((row) => row.kind === kind).map((row) => row.name);

    return {
      topics: namesOf('topic'),
      languages: namesOf('language'),
      audiences: namesOf('audience'),
    };
  }
}

// ---------------------------------------------------------------- row -> website shape

function toPin(row: PinRow): MapPin {
  return {
    publisherId: row.publisherId,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    distanceMiles: Number(row.distanceMiles),
    // bigint can't be sent as JSON, so turn it into a normal number.
    upcomingCount: Number(row.upcomingCount),
  };
}

/**
 * `now` is passed in rather than read here, so every row in one response is
 * compared against the same moment.
 */
function toListItem(row: ListRow, now: number): ShiurListItem {
  const startsAt = new Date(row.startsAt);
  const minutesUntil = Math.round((startsAt.getTime() - now) / 60_000);
  const hoursSincePosted = (now - new Date(row.shiurCreatedAt).getTime()) / 3_600_000;

  return {
    occurrenceId: row.occurrenceId,
    shiurId: row.shiurId,
    kind: row.kind,
    title: row.title,
    startsAt: startsAt.toISOString(),
    status: row.status,
    minutesUntilStart: minutesUntil <= BADGE_WINDOW_MINUTES ? minutesUntil : null,
    topic: row.topic,
    language: row.language,
    flyerUrl: row.flyerUrl,
    shul: row.shulId && row.shulName ? { id: row.shulId, name: row.shulName } : null,
    maggidShiur:
      row.maggidShiurId && row.maggidShiurName
        ? { id: row.maggidShiurId, name: row.maggidShiurName }
        : null,
    room: row.room,
    distanceMiles: Number(row.distanceMiles),
    lat: Number(row.lat),
    lng: Number(row.lng),
    isNew: hoursSincePosted < NEW_LABEL_HOURS,
  };
}
