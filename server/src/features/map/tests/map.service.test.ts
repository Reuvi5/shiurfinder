// MapService with fake queries: how database rows become what the map shows
// (FR-5): which tab, the "New" label, the "starts in" badge, pins and errors.
// The SQL itself is tested in map.queries.db.test.ts.

import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapService } from '../map.service';
import type { FilterOptionRow, ListRow, MapQueries, PinRow, ShulRow } from '../map.queries';

const NOW = new Date('2026-11-23T17:00:00Z');

function minutesFromNow(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

function row(fields: Partial<ListRow> = {}): ListRow {
  return {
    occurrenceId: 'occ-1',
    shiurId: 'shiur-1',
    kind: 'WEEKLY',
    title: 'Daf Yomi',
    startsAt: minutesFromNow(60 * 48),
    status: 'ON',
    topic: 'Gemara',
    language: 'English',
    flyerUrl: null,
    shulId: 'shul-1',
    shulName: 'Beth Aaron',
    maggidShiurId: 'rav-1',
    maggidShiurName: 'Rabbi Cohen',
    room: 'Main Beis Medrash',
    distanceMiles: 1.25,
    lat: 40.89,
    lng: -74.02,
    shiurCreatedAt: minutesFromNow(-60 * 24 * 30),
    ...fields,
  };
}

/** A MapService whose fake queries return the given rows. */
function serviceWith(rows: {
  pins?: PinRow[];
  list?: ListRow[];
  shul?: ShulRow | null;
  today?: ListRow[];
  filters?: FilterOptionRow[];
}) {
  const queries = {
    findPins: async () => rows.pins ?? [],
    findShiurim: async () => rows.list ?? [],
    findApprovedShul: async () => rows.shul ?? null,
    findShulToday: async () => rows.today ?? [],
    findFilterOptions: async () => rows.filters ?? [],
  } as unknown as MapQueries;
  return new MapService(queries);
}

const SEARCH = { lat: 40.89, lng: -74.02 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-5 map search results', () => {
  it('puts each shiur in the Weekly or Featured tab and counts them all', async () => {
    const result = await serviceWith({
      list: [
        row({ occurrenceId: 'a', kind: 'WEEKLY' }),
        row({ occurrenceId: 'b', kind: 'FEATURED' }),
        row({ occurrenceId: 'c', kind: 'WEEKLY' }),
      ],
    }).search(SEARCH);

    expect(result.weekly.map((item) => item.occurrenceId)).toEqual(['a', 'c']);
    expect(result.featured.map((item) => item.occurrenceId)).toEqual(['b']);
    expect(result.totalCount).toBe(3);
  });

  it('uses a 10 mile radius unless one is given', async () => {
    expect((await serviceWith({}).search(SEARCH)).radiusMiles).toBe(10);
    expect((await serviceWith({}).search({ ...SEARCH, radiusMiles: 3 })).radiusMiles).toBe(3);
  });

  it('returns empty lists when nothing matches', async () => {
    const result = await serviceWith({}).search(SEARCH);
    expect(result).toEqual({ pins: [], weekly: [], featured: [], totalCount: 0, radiusMiles: 10 });
  });

  it('turns pin counts and points into plain numbers', async () => {
    const pin: PinRow = {
      publisherId: 'shul-1',
      name: 'Beth Aaron',
      lat: 40.89,
      lng: -74.02,
      distanceMiles: 1.5,
      upcomingCount: 4n,
    };
    const result = await serviceWith({ pins: [pin] }).search(SEARCH);
    expect(result.pins).toEqual([{ ...pin, upcomingCount: 4 }]);
    // bigint can't be sent as JSON: this would throw if one were left.
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('sends the time as UTC text and the shul and maggid shiur as objects', async () => {
    const startsAt = new Date('2026-11-24T01:00:00Z');
    const [item] = (await serviceWith({ list: [row({ startsAt })] }).search(SEARCH)).weekly;
    expect(item.startsAt).toBe('2026-11-24T01:00:00.000Z');
    expect(item.shul).toEqual({ id: 'shul-1', name: 'Beth Aaron' });
    expect(item.maggidShiur).toEqual({ id: 'rav-1', name: 'Rabbi Cohen' });
  });

  it('leaves out a missing shul or maggid shiur', async () => {
    const list = [
      row({ shulId: null, shulName: null, maggidShiurId: null, maggidShiurName: null }),
    ];
    const [item] = (await serviceWith({ list }).search(SEARCH)).weekly;
    expect(item.shul).toBeNull();
    expect(item.maggidShiur).toBeNull();
  });
});

describe('FR-5 the "starts in" badge', () => {
  async function minutesUntilStart(startsInMinutes: number) {
    const list = [row({ startsAt: minutesFromNow(startsInMinutes) })];
    return (await serviceWith({ list }).search(SEARCH)).weekly[0].minutesUntilStart;
  }

  it('counts down for anything within 24 hours', async () => {
    expect(await minutesUntilStart(20)).toBe(20);
    expect(await minutesUntilStart(24 * 60)).toBe(24 * 60);
  });

  it('is left off further out than 24 hours', async () => {
    expect(await minutesUntilStart(24 * 60 + 1)).toBeNull();
  });

  it('goes negative once the shiur has started', async () => {
    expect(await minutesUntilStart(-5)).toBe(-5);
  });
});

describe('FR-5 the "New" label', () => {
  async function isNew(postedHoursAgo: number) {
    const list = [row({ shiurCreatedAt: minutesFromNow(-postedHoursAgo * 60) })];
    return (await serviceWith({ list }).search(SEARCH)).weekly[0].isNew;
  }

  it('shows for 72 hours after posting', async () => {
    expect(await isNew(0)).toBe(true);
    expect(await isNew(71.9)).toBe(true);
  });

  it('is gone at 72 hours', async () => {
    expect(await isNew(72)).toBe(false);
    expect(await isNew(100)).toBe(false);
  });
});

describe("FR-9 a shul's card", () => {
  const shul = { id: 'shul-1', name: 'Beth Aaron', address: '950 Queen Anne Rd' };

  it("gives the shul and today's shiurim, at the first shiur's point", async () => {
    const result = await serviceWith({
      shul,
      today: [row({ occurrenceId: 'a', lat: 40.5, lng: -74.5 }), row({ occurrenceId: 'b' })],
    }).shulToday('shul-1');

    expect(result).toMatchObject({
      publisherId: 'shul-1',
      name: 'Beth Aaron',
      address: '950 Queen Anne Rd',
      lat: 40.5,
      lng: -74.5,
    });
    expect(result.shiurim.map((item) => item.occurrenceId)).toEqual(['a', 'b']);
  });

  it('has no point and an empty list when nothing is left today', async () => {
    const result = await serviceWith({ shul, today: [] }).shulToday('shul-1');
    expect(result).toMatchObject({ lat: 0, lng: 0, shiurim: [] });
  });

  it('is "not found" for a missing or unapproved shul (NFR-4)', async () => {
    const error = await serviceWith({ shul: null })
      .shulToday('shul-1')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({ code: 'SHUL_NOT_FOUND' });
  });
});

describe('FR-8 the Filters panel choices', () => {
  it('splits the choices into their three groups, keeping their order', async () => {
    const result = await serviceWith({
      filters: [
        { kind: 'audience', name: 'Women', sort: 0 },
        { kind: 'language', name: 'English', sort: 0 },
        { kind: 'topic', name: 'Gemara', sort: 0 },
        { kind: 'topic', name: 'Halacha', sort: 1 },
      ],
    }).filterOptions();

    expect(result).toEqual({
      topics: ['Gemara', 'Halacha'],
      languages: ['English'],
      audiences: ['Women'],
    });
  });

  it('gives empty groups when no shiurim are coming up', async () => {
    expect(await serviceWith({}).filterOptions()).toEqual({
      topics: [],
      languages: [],
      audiences: [],
    });
  });
});
