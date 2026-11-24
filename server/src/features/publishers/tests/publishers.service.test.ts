// PublishersService with fake queries (FR-10): a shul's page, a maggid
// shiur's page, the one-line address, and "not found". The SQL is in
// publishers.queries.db.test.ts.

import { NotFoundException } from '@nestjs/common';
import type { MaggidShiurPageResult, ShulPageResult } from '@shiurfinder/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublisherRow, PublishersQueries, UpcomingRow } from '../publishers.queries';
import { PublishersService } from '../publishers.service';

const NOW = new Date('2026-11-23T17:00:00Z');

function publisher(fields: Partial<PublisherRow> = {}): PublisherRow {
  return {
    id: 'pub-1',
    type: 'SHUL',
    name: 'Beth Aaron',
    address: '950 Queen Anne Rd',
    city: 'Teaneck',
    state: 'NJ',
    zip: '07666',
    contact: 'office@bethaaron.org',
    imageUrl: null,
    bio: null,
    ...fields,
  };
}

function upcoming(fields: Partial<UpcomingRow> = {}): UpcomingRow {
  return {
    occurrenceId: 'occ-1',
    shiurId: 'shiur-1',
    kind: 'WEEKLY',
    title: 'Daf Yomi',
    startsAt: new Date(NOW.getTime() + 30 * 60_000),
    status: 'ON',
    topic: null,
    language: null,
    flyerUrl: null,
    shulId: 'pub-1',
    shulName: 'Beth Aaron',
    maggidShiurId: null,
    maggidShiurName: null,
    room: null,
    lat: 40.89,
    lng: -74.02,
    shiurCreatedAt: new Date(NOW.getTime() - 24 * 3_600_000),
    ...fields,
  };
}

/** A PublishersService whose fake queries return the given rows. */
function serviceWith(rows: {
  publisher: PublisherRow | null;
  featured?: UpcomingRow[];
  weekly?: UpcomingRow[];
  upcoming?: UpcomingRow[];
  shuls?: { id: string; name: string }[];
}) {
  const queries = {
    findApprovedPublisher: async () => rows.publisher,
    findUpcoming: async (owner: object, kind?: string) => {
      if ('maggidShiurId' in owner) return rows.upcoming ?? [];
      return kind === 'FEATURED' ? (rows.featured ?? []) : (rows.weekly ?? []);
    },
    findShulsOfMaggid: async () => rows.shuls ?? [],
  } as unknown as PublishersQueries;
  return new PublishersService(queries);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FR-10 a shul's page", () => {
  it('has its details and its featured and weekly shiurim', async () => {
    const page = (await serviceWith({
      publisher: publisher(),
      featured: [upcoming({ occurrenceId: 'f', kind: 'FEATURED' })],
      weekly: [upcoming({ occurrenceId: 'w1' }), upcoming({ occurrenceId: 'w2' })],
    }).page('pub-1')) as ShulPageResult;

    expect(page).toMatchObject({
      type: 'SHUL',
      id: 'pub-1',
      name: 'Beth Aaron',
      contact: 'office@bethaaron.org',
    });
    expect(page.featured.map((item) => item.occurrenceId)).toEqual(['f']);
    expect(page.weekly.map((item) => item.occurrenceId)).toEqual(['w1', 'w2']);
  });

  it('gives each shiur the same badge and "New" label as the map', async () => {
    const page = (await serviceWith({
      publisher: publisher(),
      weekly: [upcoming()],
    }).page('pub-1')) as ShulPageResult;
    expect(page.weekly[0]).toMatchObject({ minutesUntilStart: 30, isNew: true });
  });

  it('puts a shiur with no map point at 0, 0 instead of failing', async () => {
    const page = (await serviceWith({
      publisher: publisher(),
      weekly: [upcoming({ lat: null, lng: null })],
    }).page('pub-1')) as ShulPageResult;
    expect(page.weekly[0]).toMatchObject({ lat: 0, lng: 0 });
  });
});

describe('FR-10 the one-line address', () => {
  async function address(fields: Partial<PublisherRow>) {
    return ((await serviceWith({ publisher: publisher(fields) }).page('pub-1')) as ShulPageResult)
      .address;
  }

  it('joins the street, city, state and zip', async () => {
    expect(await address({})).toBe('950 Queen Anne Rd, Teaneck, NJ 07666');
  });

  it("doesn't repeat a city, state or zip the street already has, in any case", async () => {
    expect(await address({ address: '950 Queen Anne Rd, teaneck, nj 07666' })).toBe(
      '950 Queen Anne Rd, teaneck, nj 07666',
    );
  });

  it('puts a missing zip right after a state the street already has, with no comma', async () => {
    expect(await address({ address: '950 Queen Anne Rd, Teaneck, NJ' })).toBe(
      '950 Queen Anne Rd, Teaneck, NJ 07666',
    );
  });

  it('uses whatever parts are there, or null with none', async () => {
    expect(await address({ address: null, zip: null })).toBe('Teaneck, NJ');
    expect(await address({ address: null, city: null, state: null, zip: null })).toBeNull();
  });
});

describe("FR-10 a maggid shiur's page", () => {
  it('has their bio, shuls, and upcoming shiurim', async () => {
    const page = (await serviceWith({
      publisher: publisher({ type: 'MAGGID_SHIUR', name: 'Rabbi Cohen', bio: 'Rosh Kollel' }),
      shuls: [{ id: 'shul-1', name: 'Beth Aaron' }],
      upcoming: [upcoming({ occurrenceId: 'u1' })],
    }).page('pub-1')) as MaggidShiurPageResult;

    expect(page).toMatchObject({
      type: 'MAGGID_SHIUR',
      name: 'Rabbi Cohen',
      bio: 'Rosh Kollel',
      shuls: [{ id: 'shul-1', name: 'Beth Aaron' }],
    });
    expect(page.upcoming.map((item) => item.occurrenceId)).toEqual(['u1']);
  });
});

describe('NFR-4 a missing or unapproved publisher', () => {
  it('is "not found"', async () => {
    const error = await serviceWith({ publisher: null })
      .page('pub-1')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      code: 'PUBLISHER_NOT_FOUND',
    });
  });
});
