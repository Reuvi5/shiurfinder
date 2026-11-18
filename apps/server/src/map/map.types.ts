import type { MapSearchDto } from './dto/map-search.dto';

export const METERS_PER_MILE = 1609.344;

/** SDD: the map shows the next 7 days. */
export const MAP_WINDOW_DAYS = 7;

/** How long a newly posted shiur keeps its "New" label. */
export const NEW_LABEL_HOURS = 72;

/** Only show a "Now / in N min" badge for shiurim inside this window. */
export const BADGE_WINDOW_MINUTES = 24 * 60;

/** A raw row from the pin query. */
export interface PinRow {
  publisherId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  upcomingCount: bigint;
}

/** A raw row from any of the list queries. */
export interface ListRow {
  occurrenceId: string;
  shiurId: string;
  kind: 'WEEKLY' | 'FEATURED';
  title: string;
  startsAt: Date;
  status: 'ON' | 'CHANGED' | 'REPORTED' | 'CANCELLED';
  topic: string | null;
  language: string | null;
  flyerUrl: string | null;
  shulId: string | null;
  shulName: string | null;
  maggidShiurId: string | null;
  maggidShiurName: string | null;
  room: string | null;
  distanceMiles: number;
  lat: number;
  lng: number;
  shiurCreatedAt: Date;
}

export interface ShulRow {
  id: string;
  name: string;
  address: string | null;
  /** Null until the geocoder has set the shul's location. */
  lat: number | null;
  lng: number | null;
}

/**
 * What MapService needs from storage, and nothing more.
 *
 * MapService depends on this, not on MapRepository or PrismaService, so the
 * rules can be unit tested with a fake and so swapping how we query (a view, a
 * cache, a different ORM) doesn't reach into the service.
 */
export interface MapRepositoryPort {
  findPins(dto: MapSearchDto, radiusMeters: number): Promise<PinRow[]>;
  findShiurim(dto: MapSearchDto, radiusMeters: number): Promise<ListRow[]>;
  findShulToday(publisherId: string, lat?: number, lng?: number): Promise<ListRow[]>;
  findApprovedShul(publisherId: string): Promise<ShulRow | null>;
}

/** Nest injection token for the port above. */
export const MAP_REPOSITORY = Symbol('MAP_REPOSITORY');
