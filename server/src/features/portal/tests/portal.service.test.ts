// PortalService with fake queries (FR-20): the form's choices, and every
// reason a new shiur is turned down. Saving is tested in
// portal.controller.db.test.ts, on a real database.

import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortalQueries } from '../portal.queries';
import { PortalService } from '../portal.service';
import type { NewShiurInput } from '../portal.validation';

const NOW = new Date('2026-11-23T17:00:00Z');
const TOMORROW = new Date('2026-11-24T17:00:00Z');

/** What the fake database has. Anything not listed exists. */
interface World {
  shulExists?: boolean;
  ravExists?: boolean;
  roomInShul?: boolean;
  topicExists?: boolean;
  starts?: Date[];
}

function serviceWith(world: World = {}) {
  const queries = {
    findShuls: async () =>
      world.shulExists === false ? [] : [{ id: 'shul-1', name: 'Beth Aaron' }],
    findOptions: async () => ({
      rooms: [
        { id: 'room-1', name: 'Main', publisherId: 'shul-1' },
        { id: 'room-2', name: 'Social Hall', publisherId: 'shul-2' },
      ],
      maggideiShiur: [],
      topics: [],
      languages: [],
      audiences: [],
    }),
    maggidShiurExists: async () => world.ravExists ?? true,
    roomBelongsTo: async () => world.roomInShul ?? true,
    topicExists: async () => world.topicExists ?? true,
    languageExists: async () => true,
    audienceExists: async () => true,
    weeklyStarts: async () => world.starts ?? [TOMORROW],
    featuredStart: async () => (world.starts ?? [TOMORROW])[0],
    create: async (_draft: unknown, starts: Date[]) => ({
      shiurId: 'shiur-1',
      occurrenceIds: starts.map((_, i) => `occ-${i}`),
    }),
  } as unknown as PortalQueries;
  return new PortalService(queries);
}

const WEEKLY: NewShiurInput = {
  kind: 'WEEKLY',
  title: 'Daf Yomi',
  shul: { id: 'shul-1' },
  startTime: '20:00',
  daysOfWeek: [1],
};

/** The error a create call fails with, and its { code, message }. */
async function failure(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(HttpException);
  return {
    error,
    body: (error as HttpException).getResponse() as { code: string; message: string },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FR-20 the form's choices", () => {
  it('lists each shul with only its own rooms', async () => {
    const options = await serviceWith().options();
    expect(options.shuls).toEqual([
      { id: 'shul-1', name: 'Beth Aaron', rooms: [{ id: 'room-1', name: 'Main' }] },
    ]);
  });
});

describe('FR-20 posting a shiur', () => {
  it('returns the first date and how many dates were made', async () => {
    const starts = [TOMORROW, new Date('2026-12-01T17:00:00Z')];
    expect(await serviceWith({ starts }).create(WEEKLY)).toEqual({
      shiurId: 'shiur-1',
      firstOccurrenceId: 'occ-0',
      occurrenceCount: 2,
    });
  });

  it('turns down a date and time that already passed', async () => {
    const { error, body } = await failure(
      serviceWith({ starts: [new Date(NOW.getTime() - 60_000)] }).create({
        ...WEEKLY,
        kind: 'FEATURED',
        date: '2026-11-23',
      } as NewShiurInput),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(body.code).toBe('DATE_PASSED');
  });

  it('turns down a weekly shiur with no dates left', async () => {
    const { body } = await failure(serviceWith({ starts: [] }).create(WEEKLY));
    expect(body.code).toBe('DATE_PASSED');
  });

  it('is "not found" for a missing or unapproved shul (NFR-4)', async () => {
    const { error, body } = await failure(serviceWith({ shulExists: false }).create(WEEKLY));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(body.code).toBe('SHUL_NOT_FOUND');
  });

  it('turns down a picked maggid shiur that is missing or unapproved', async () => {
    const { body } = await failure(
      serviceWith({ ravExists: false }).create({ ...WEEKLY, maggidShiur: { id: 'rav-1' } }),
    );
    expect(body).toMatchObject({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('maggidShiur'),
    });
  });

  it('turns down a room from another shul', async () => {
    const { body } = await failure(
      serviceWith({ roomInShul: false }).create({ ...WEEKLY, room: { id: 'room-2' } }),
    );
    expect(body.message).toContain('room');
  });

  it('turns down a picked room for a new shul, which has no rooms yet', async () => {
    const newShul = { name: 'Bais Chaim', address: '1 Main St', lat: 40.9, lng: -74 };
    const { body } = await failure(
      serviceWith().create({ ...WEEKLY, shul: newShul, room: { id: 'room-1' } }),
    );
    expect(body.message).toContain('new shul has no rooms');
  });

  it('turns down a picked topic that is missing', async () => {
    const { body } = await failure(
      serviceWith({ topicExists: false }).create({ ...WEEKLY, topic: { id: 'topic-1' } }),
    );
    expect(body.code).toBe('INVALID_REQUEST');
  });

  it('needs no checks for names typed in as new', async () => {
    const result = await serviceWith({ ravExists: false, topicExists: false }).create({
      ...WEEKLY,
      maggidShiur: { name: 'Rabbi New' },
      topic: { name: 'New Topic' },
    });
    expect(result.shiurId).toBe('shiur-1');
  });
});
