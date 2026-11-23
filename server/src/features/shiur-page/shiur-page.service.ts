// The logic behind the shiur popup and page (FR-9).
//
// Asks shiur-page.queries.ts for the row, then works out what the website
// shows: how long the shiur is and its Hebrew date. No SQL in this file.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { ShiurDetails } from '@shiurfinder/shared';
import { ShiurPageQueries, type DetailsRow } from './shiur-page.queries';

@Injectable()
export class ShiurPageService {
  constructor(private readonly queries: ShiurPageQueries) {}

  /**
   * One date of a shiur. lat/lng are the user's search point, used only to
   * work out distance. They are never saved (NFR-5).
   */
  async details(occurrenceId: string, lat?: number, lng?: number): Promise<ShiurDetails> {
    const row = await this.queries.findDetails(occurrenceId, lat, lng);

    // Missing and unapproved look the same, so nobody can find out an
    // unapproved shiur exists (NFR-4).
    if (!row) {
      throw new NotFoundException({
        code: 'SHIUR_NOT_FOUND',
        message: 'That shiur could not be found.',
      });
    }

    return toDetails(row);
  }
}

// ---------------------------------------------------------------- row -> website shape

function toDetails(row: DetailsRow): ShiurDetails {
  const startsAt = new Date(row.startsAt);

  return {
    occurrenceId: row.occurrenceId,
    shiurId: row.shiurId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    startsAt: startsAt.toISOString(),
    hebrewDate: hebrewDate(startsAt),
    lengthMinutes: lengthMinutes(row, startsAt),
    daysOfWeek: row.kind === 'WEEKLY' ? row.daysOfWeek : [],
    status: row.status,
    reason: row.reason,
    topic: row.topic,
    language: row.language,
    audience: row.audience,
    flyerUrl: row.flyerUrl,
    shul:
      row.shulId && row.shulName
        ? { id: row.shulId, name: row.shulName, address: row.shulAddress }
        : null,
    maggidShiur:
      row.maggidShiurId && row.maggidShiurName
        ? { id: row.maggidShiurId, name: row.maggidShiurName }
        : null,
    room: row.room,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    distanceMiles: row.distanceMiles === null ? null : Number(row.distanceMiles),
  };
}

/**
 * This date's own end time if it has one (a publisher may change one date),
 * otherwise the shiur's usual length.
 */
function lengthMinutes(row: DetailsRow, startsAt: Date): number | null {
  if (row.endsAt) {
    return Math.round((new Date(row.endsAt).getTime() - startsAt.getTime()) / 60_000);
  }
  return row.durationMinutes;
}

// ---------------------------------------------------------------- Hebrew date

/**
 * The Hebrew calendar is built into Node (Intl), so no extra package.
 * timeZone matters: without it, an 8pm shiur would use the server's date
 * (UTC, already tomorrow) and show the next day's Hebrew date.
 */
const HEBREW_DATE = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  timeZone: 'America/New_York',
  day: 'numeric',
  month: 'long',
});

/** Intl's spellings that differ from the ones our users expect. */
const MONTH_SPELLING: Record<string, string> = {
  Tishri: 'Tishrei',
  Heshvan: 'Cheshvan',
  Tamuz: 'Tammuz',
};

/**
 * e.g. "2 Cheshvan". Uses the regular (daytime) date, like a printed calendar:
 * an evening shiur shows the date of that day, not the next Hebrew day that
 * starts at sunset.
 */
function hebrewDate(date: Date): string {
  const parts = HEBREW_DATE.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${day} ${MONTH_SPELLING[month] ?? month}`;
}
