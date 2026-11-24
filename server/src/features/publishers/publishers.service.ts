// The logic behind the shul and maggid shiur pages (FR-10).
//
// Asks publishers.queries.ts for rows, then builds the page: featured and
// weekly shiurim for a shul; bio, shuls and upcoming shiurim for a maggid
// shiur. No SQL in this file.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MaggidShiurPageResult,
  PublisherPageResult,
  ShiurListItem,
  ShulPageResult,
} from '@shiurfinder/shared';
// Same "New" and "in 20 min" rules as the map, so a shiur's badge matches everywhere.
import { BADGE_WINDOW_MINUTES, NEW_LABEL_HOURS } from '../map/map.constants';
import { PublishersQueries, type PublisherRow, type UpcomingRow } from './publishers.queries';

@Injectable()
export class PublishersService {
  constructor(private readonly queries: PublishersQueries) {}

  /** A shul's or maggid shiur's public page. Anyone can see it, no sign-in (FR-1). */
  async page(id: string): Promise<PublisherPageResult> {
    const publisher = await this.queries.findApprovedPublisher(id);

    // An unapproved publisher gets the same "not found" as a missing one, so
    // nobody can find out it exists before a moderator approves it (NFR-4).
    if (!publisher) {
      throw new NotFoundException({
        code: 'PUBLISHER_NOT_FOUND',
        message: 'That page could not be found.',
      });
    }

    return publisher.type === 'SHUL' ? this.shulPage(publisher) : this.maggidPage(publisher);
  }

  private async shulPage(shul: PublisherRow): Promise<ShulPageResult> {
    const [featuredRows, weeklyRows] = await Promise.all([
      this.queries.findUpcoming({ shulId: shul.id }, 'FEATURED'),
      this.queries.findUpcoming({ shulId: shul.id }, 'WEEKLY'),
    ]);
    const now = Date.now();

    return {
      type: 'SHUL',
      id: shul.id,
      name: shul.name,
      address: oneLineAddress(shul),
      contact: shul.contact,
      imageUrl: shul.imageUrl,
      featured: featuredRows.map((row) => toListItem(row, now)),
      weekly: weeklyRows.map((row) => toListItem(row, now)),
    };
  }

  private async maggidPage(rav: PublisherRow): Promise<MaggidShiurPageResult> {
    // Includes shiurim a shul posted with this maggid shiur on them (FR-19).
    const [shuls, upcomingRows] = await Promise.all([
      this.queries.findShulsOfMaggid(rav.id),
      this.queries.findUpcoming({ maggidShiurId: rav.id }),
    ]);
    const now = Date.now();

    return {
      type: 'MAGGID_SHIUR',
      id: rav.id,
      name: rav.name,
      bio: rav.bio,
      contact: rav.contact,
      imageUrl: rav.imageUrl,
      shuls,
      upcoming: upcomingRows.map((row) => toListItem(row, now)),
    };
  }
}

// ---------------------------------------------------------------- helpers

/**
 * e.g. "1355 Queen Anne Rd, Teaneck, NJ 07666". Null if there's no address at all.
 * Some addresses already include the city and state (the seed's do), so a part
 * is only added if it isn't in there yet. Otherwise you'd get "Teaneck, NJ" twice.
 */
function oneLineAddress(p: PublisherRow): string | null {
  const street = p.address ?? '';
  const missing = (part: string | null) =>
    part && !street.toLowerCase().includes(part.toLowerCase());
  const stateZip = [p.state, p.zip].filter(missing).join(' ');
  const parts = [street, missing(p.city) ? p.city : null].filter(Boolean);

  // A zip goes after its state with a space, even when the state is already in
  // the street: "Teaneck, NJ 07666", not "Teaneck, NJ, 07666".
  const stateInStreet = p.state && !missing(p.state);
  if (stateZip && stateInStreet && parts.length === 1) {
    parts[0] = `${parts[0]} ${stateZip}`;
  } else if (stateZip) {
    parts.push(stateZip);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Same shape the map sends, so the shared ShiurRow can show it. No distance:
 * these pages don't know where the user is.
 */
function toListItem(row: UpcomingRow, now: number): ShiurListItem {
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
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    isNew: hoursSincePosted < NEW_LABEL_HOURS,
  };
}
