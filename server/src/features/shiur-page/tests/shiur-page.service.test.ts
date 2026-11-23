// ShiurPageService with fake queries (FR-9): the Hebrew date, the length,
// the weekly days, and "not found". The SQL is in shiur-page.queries.db.test.ts.

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { DetailsRow, ShiurPageQueries } from '../shiur-page.queries';
import { ShiurPageService } from '../shiur-page.service';

function row(fields: Partial<DetailsRow> = {}): DetailsRow {
  return {
    occurrenceId: 'occ-1',
    shiurId: 'shiur-1',
    kind: 'WEEKLY',
    title: 'Daf Yomi',
    description: null,
    startsAt: new Date('2026-10-26T16:00:00Z'),
    endsAt: null,
    durationMinutes: 60,
    daysOfWeek: [0, 2],
    status: 'ON',
    reason: null,
    topic: 'Gemara',
    language: 'English',
    audience: null,
    flyerUrl: null,
    shulId: 'shul-1',
    shulName: 'Beth Aaron',
    shulAddress: '950 Queen Anne Rd',
    maggidShiurId: 'rav-1',
    maggidShiurName: 'Rabbi Cohen',
    room: null,
    lat: 40.89,
    lng: -74.02,
    distanceMiles: null,
    ...fields,
  };
}

/** The details for one row, through a fake query that returns it. */
function details(fields: Partial<DetailsRow> = {}) {
  const queries = { findDetails: async () => row(fields) } as unknown as ShiurPageQueries;
  return new ShiurPageService(queries).details('occ-1');
}

describe('FR-9 the Hebrew date', () => {
  it("uses the New York date, so an 8pm shiur isn't shown as the next day", async () => {
    // 8pm Oct 12 in New York is already Oct 13 in UTC (2 Cheshvan).
    expect((await details({ startsAt: new Date('2026-10-13T00:00:00Z') })).hebrewDate).toBe(
      '1 Cheshvan',
    );
    expect((await details({ startsAt: new Date('2026-10-13T16:00:00Z') })).hebrewDate).toBe(
      '2 Cheshvan',
    );
  });

  it('spells the months the way our users expect', async () => {
    expect((await details({ startsAt: new Date('2026-09-12T16:00:00Z') })).hebrewDate).toBe(
      '1 Tishrei',
    );
    expect((await details({ startsAt: new Date('2026-06-16T16:00:00Z') })).hebrewDate).toBe(
      '1 Tammuz',
    );
    expect((await details({ startsAt: new Date('2026-06-15T16:00:00Z') })).hebrewDate).toBe(
      '30 Sivan',
    );
  });
});

describe('FR-9 the length', () => {
  it("uses this date's own end time when it has one", async () => {
    const startsAt = new Date('2026-10-26T16:00:00Z');
    const endsAt = new Date('2026-10-26T17:45:00Z');
    expect((await details({ startsAt, endsAt, durationMinutes: 60 })).lengthMinutes).toBe(105);
  });

  it("otherwise uses the shiur's usual length", async () => {
    expect((await details({ durationMinutes: 45 })).lengthMinutes).toBe(45);
  });

  it("is null when the publisher didn't give one", async () => {
    expect((await details({ durationMinutes: null })).lengthMinutes).toBeNull();
  });
});

describe('FR-9 the rest of the details', () => {
  it("lists a weekly shiur's days, and none for a featured one", async () => {
    expect((await details({ kind: 'WEEKLY', daysOfWeek: [0, 2] })).daysOfWeek).toEqual([0, 2]);
    expect((await details({ kind: 'FEATURED', daysOfWeek: [3] })).daysOfWeek).toEqual([]);
  });

  it('sends the time as UTC text and the shul with its address', async () => {
    const result = await details();
    expect(result.startsAt).toBe('2026-10-26T16:00:00.000Z');
    expect(result.shul).toEqual({ id: 'shul-1', name: 'Beth Aaron', address: '950 Queen Anne Rd' });
    expect(result.maggidShiur).toEqual({ id: 'rav-1', name: 'Rabbi Cohen' });
  });

  it('leaves out a missing shul, maggid shiur, map point or distance', async () => {
    const result = await details({
      shulId: null,
      shulName: null,
      maggidShiurId: null,
      maggidShiurName: null,
      lat: null,
      lng: null,
    });
    expect(result).toMatchObject({
      shul: null,
      maggidShiur: null,
      lat: null,
      lng: null,
      distanceMiles: null,
    });
  });
});

describe('NFR-4 a missing or unapproved shiur', () => {
  it('is "not found"', async () => {
    const queries = { findDetails: async () => null } as unknown as ShiurPageQueries;
    const error = await new ShiurPageService(queries)
      .details('occ-1')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({ code: 'SHIUR_NOT_FOUND' });
  });
});
