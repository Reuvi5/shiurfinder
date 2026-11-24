// What a new shiur may contain (FR-20): the shape of the "Post a shiur" form.

import { describe, expect, it } from 'vitest';
import { newShiurSchema } from '../portal.validation';

const WEEKLY = {
  kind: 'WEEKLY',
  title: 'Daf Yomi',
  shul: { id: 'shul-1' },
  startTime: '20:00',
  daysOfWeek: [1],
};

const FEATURED = {
  kind: 'FEATURED',
  title: 'Guest Lecture',
  shul: { id: 'shul-1' },
  startTime: '19:30',
  date: '2026-12-01',
};

function parse(input: object) {
  return newShiurSchema.safeParse(input);
}

describe('FR-20 a weekly shiur', () => {
  it('needs at least one day, and drops repeats', () => {
    expect(parse({ ...WEEKLY, daysOfWeek: [] }).success).toBe(false);
    const result = parse({ ...WEEKLY, daysOfWeek: [3, 1, 1, 0] });
    expect(result.success && result.data).toMatchObject({ daysOfWeek: [0, 1, 3] });
  });

  it('takes days from 0 (Sunday) to 6 only', () => {
    expect(parse({ ...WEEKLY, daysOfWeek: [6] }).success).toBe(true);
    expect(parse({ ...WEEKLY, daysOfWeek: [7] }).success).toBe(false);
  });
});

describe('FR-20 a featured shiur', () => {
  it('needs a date written as YYYY-MM-DD', () => {
    expect(parse(FEATURED).success).toBe(true);
    expect(parse({ ...FEATURED, date: '12/01/2026' }).success).toBe(false);
    const { date: _date, ...noDate } = FEATURED;
    expect(parse(noDate).success).toBe(false);
  });

  it('needs a kind of WEEKLY or FEATURED', () => {
    expect(parse({ ...FEATURED, kind: 'MONTHLY' }).success).toBe(false);
  });
});

describe('FR-20 fields every shiur has', () => {
  it('needs a title, trimmed, up to 120 characters', () => {
    const result = parse({ ...WEEKLY, title: '  Daf Yomi  ' });
    expect(result.success && result.data.title).toBe('Daf Yomi');
    expect(parse({ ...WEEKLY, title: '   ' }).success).toBe(false);
    expect(parse({ ...WEEKLY, title: 'a'.repeat(121) }).success).toBe(false);
  });

  it('takes the start time as 24-hour HH:mm', () => {
    expect(parse({ ...WEEKLY, startTime: '7:30' }).success).toBe(false);
    expect(parse({ ...WEEKLY, startTime: '24:00' }).success).toBe(false);
  });

  it('takes a length from 5 to 600 whole minutes, or none', () => {
    expect(parse({ ...WEEKLY, durationMinutes: 5 }).success).toBe(true);
    expect(parse({ ...WEEKLY, durationMinutes: 600 }).success).toBe(true);
    expect(parse({ ...WEEKLY, durationMinutes: 4 }).success).toBe(false);
    expect(parse({ ...WEEKLY, durationMinutes: 601 }).success).toBe(false);
    expect(parse({ ...WEEKLY, durationMinutes: 45.5 }).success).toBe(false);
  });

  it('treats an empty description as no description', () => {
    const result = parse({ ...WEEKLY, description: '   ' });
    expect(result.success && result.data.description).toBeUndefined();
  });
});

describe('FR-20 picking or typing in a shul, maggid shiur, room, topic or language', () => {
  it('takes either an id or a new name, not both', () => {
    expect(parse({ ...WEEKLY, topic: { id: 'topic-1' } }).success).toBe(true);
    expect(parse({ ...WEEKLY, topic: { name: 'Gemara' } }).success).toBe(true);
    expect(parse({ ...WEEKLY, topic: { id: 'topic-1', name: 'Gemara' } }).success).toBe(false);
    expect(parse({ ...WEEKLY, maggidShiur: { name: '  ' } }).success).toBe(false);
  });

  it('needs a new shul to have its address and map point', () => {
    const shul = { name: 'Bais Chaim', address: '1 Main St, Teaneck, NJ', lat: 40.9, lng: -74 };
    expect(parse({ ...WEEKLY, shul }).success).toBe(true);
    expect(parse({ ...WEEKLY, shul: { ...shul, address: '' } }).success).toBe(false);
    expect(parse({ ...WEEKLY, shul: { ...shul, lat: 91 } }).success).toBe(false);
    const { lng: _lng, ...noPoint } = shul;
    expect(parse({ ...WEEKLY, shul: noPoint }).success).toBe(false);
  });
});
