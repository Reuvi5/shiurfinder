import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  MapPin,
  MapSearchResult,
  ShiurListItem,
  ShulTodayResult,
} from '@shiurfinder/shared';
import type { MapSearchDto } from './dto/map-search.dto';
import {
  BADGE_WINDOW_MINUTES,
  MAP_REPOSITORY,
  METERS_PER_MILE,
  NEW_LABEL_HOURS,
  type ListRow,
  type MapRepositoryPort,
  type PinRow,
} from './map.types';

const DEFAULT_RADIUS_MILES = 10; // FR-5 / UI: "Near: [address] · 10 mi"

/**
 * The rules behind the map home screen (FR-5, UC-1).
 *
 * Holds no SQL: it asks MapRepositoryPort for rows and decides what they mean —
 * which list a shiur belongs in, whether it still counts as "New", whether a
 * countdown badge should show. Those are product decisions and they change for
 * product reasons, so they live apart from how the rows are fetched.
 */
@Injectable()
export class MapService {
  constructor(
    @Inject(MAP_REPOSITORY) private readonly repo: MapRepositoryPort,
  ) {}

  /**
   * UC-1 steps 5-7: one pin per shul, plus the Featured and Weekly lists.
   *
   * The caller's lat/lng is used for these queries and never written anywhere
   * (NFR-5: the current location is never stored).
   */
  async search(dto: MapSearchDto): Promise<MapSearchResult> {
    const radiusMiles = dto.radiusMiles ?? DEFAULT_RADIUS_MILES;
    const radiusMeters = radiusMiles * METERS_PER_MILE;
    const now = Date.now();

    // Independent queries, so they run together rather than one after the other
    // — NFR-1 gives the whole screen 6 seconds.
    const [pinRows, listRows] = await Promise.all([
      this.repo.findPins(dto, radiusMeters),
      this.repo.findShiurim(dto, radiusMeters),
    ]);

    const items = listRows.map((row) => this.toListItem(row, now));

    return {
      pins: pinRows.map((row) => this.toPin(row)),
      featured: items.filter((i) => i.kind === 'FEATURED'),
      weekly: items.filter((i) => i.kind === 'WEEKLY'),
      totalCount: items.length,
      radiusMiles,
    };
  }

  /**
   * UC-1 steps 10-11: the card that opens when a pin is clicked.
   * lat/lng are optional — without them the rows come back with distance 0.
   */
  async shulToday(publisherId: string, lat?: number, lng?: number): Promise<ShulTodayResult> {
    const shul = await this.repo.findApprovedShul(publisherId);

    if (!shul) {
      // Unapproved and non-existent look the same from outside, so an
      // unapproved shul can't be confirmed to exist (NFR-4).
      throw new NotFoundException({
        code: 'SHUL_NOT_FOUND',
        message: 'That shul could not be found.',
      });
    }

    const rows = await this.repo.findShulToday(publisherId, lat, lng);
    const now = Date.now();
    const shiurim = rows.map((row) => this.toListItem(row, now));

    return {
      publisherId: shul.id,
      name: shul.name,
      address: shul.address,
      // From the shul, not its first shiur: a shul with nothing left today
      // still has a location.
      lat: shul.lat === null ? null : Number(shul.lat),
      lng: shul.lng === null ? null : Number(shul.lng),
      shiurim,
    };
  }

  // ---------------------------------------------------------------- rules

  private toPin(row: PinRow): MapPin {
    return {
      publisherId: row.publisherId,
      name: row.name,
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceMiles: Number(row.distanceMiles),
      // COUNT() comes back as bigint and JSON.stringify throws on those.
      upcomingCount: Number(row.upcomingCount),
    };
  }

  /**
   * `now` is passed in rather than read here, so every row in one response is
   * judged against the same instant — and so tests can pin it.
   */
  private toListItem(row: ListRow, now: number): ShiurListItem {
    const startsAt = new Date(row.startsAt);
    const minutesUntil = Math.round((startsAt.getTime() - now) / 60_000);

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
      isNew: now - new Date(row.shiurCreatedAt).getTime() < NEW_LABEL_HOURS * 3_600_000,
    };
  }
}
