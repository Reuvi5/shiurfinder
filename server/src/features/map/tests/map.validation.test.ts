// What a map request may contain (FR-5, FR-8): good values are turned into
// numbers, bad ones are rejected before the controller runs.

import { describe, expect, it } from 'vitest';
import { mapSearchSchema, shulTodaySchema } from '../map.validation';

/** A valid search, with `extra` added or replaced. URL values arrive as text. */
function search(extra: Record<string, string> = {}) {
  return mapSearchSchema.safeParse({ lat: '40.89', lng: '-74.02', ...extra });
}

describe('FR-5 map search input', () => {
  it('turns lat and lng from text into numbers', () => {
    const result = search();
    expect(result.success && result.data).toMatchObject({ lat: 40.89, lng: -74.02 });
  });

  it('needs lat and lng', () => {
    expect(mapSearchSchema.safeParse({ lat: '40.89' }).success).toBe(false);
    expect(mapSearchSchema.safeParse({ lng: '-74.02' }).success).toBe(false);
  });

  it('accepts the edges of the map and rejects past them', () => {
    expect(search({ lat: '90', lng: '180' }).success).toBe(true);
    expect(search({ lat: '-90', lng: '-180' }).success).toBe(true);
    expect(search({ lat: '90.1' }).success).toBe(false);
    expect(search({ lng: '-180.1' }).success).toBe(false);
    expect(search({ lat: 'north' }).success).toBe(false);
  });

  it('caps the radius at 100 miles and needs it above 0', () => {
    expect(search({ radiusMiles: '100' }).success).toBe(true);
    expect(search({ radiusMiles: '100.5' }).success).toBe(false);
    expect(search({ radiusMiles: '0' }).success).toBe(false);
  });

  it('trims the search text and rejects an empty or very long one', () => {
    const result = search({ q: '  gemara  ' });
    expect(result.success && result.data.q).toBe('gemara');
    expect(search({ q: '   ' }).success).toBe(false);
    expect(search({ q: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('FR-8 map filters input', () => {
  it('takes a day of the week from 0 (Sunday) to 6', () => {
    const result = search({ dayOfWeek: '0' });
    expect(result.success && result.data.dayOfWeek).toBe(0);
    expect(search({ dayOfWeek: '6' }).success).toBe(true);
    expect(search({ dayOfWeek: '7' }).success).toBe(false);
    expect(search({ dayOfWeek: '1.5' }).success).toBe(false);
  });

  it('takes times as 24-hour HH:mm only', () => {
    expect(search({ afterTime: '00:00' }).success).toBe(true);
    expect(search({ afterTime: '23:59' }).success).toBe(true);
    expect(search({ afterTime: '24:00' }).success).toBe(false);
    expect(search({ afterTime: '7:30' }).success).toBe(false);
    expect(search({ afterTime: '19:60' }).success).toBe(false);
  });

  it('needs afterTime to be earlier than beforeTime', () => {
    expect(search({ afterTime: '12:00', beforeTime: '17:00' }).success).toBe(true);
    expect(search({ afterTime: '17:00', beforeTime: '17:00' }).success).toBe(false);
    expect(search({ afterTime: '18:00', beforeTime: '17:00' }).success).toBe(false);
  });

  it('caps topic, language and audience at 50 characters', () => {
    expect(search({ topic: 'a'.repeat(50) }).success).toBe(true);
    expect(search({ topic: 'a'.repeat(51) }).success).toBe(false);
    expect(search({ language: 'a'.repeat(51) }).success).toBe(false);
    expect(search({ audience: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe("FR-9 a shul's card input", () => {
  it('needs no location, but checks one if sent', () => {
    expect(shulTodaySchema.safeParse({}).success).toBe(true);
    const result = shulTodaySchema.safeParse({ lat: '40.9', lng: '-74' });
    expect(result.success && result.data).toEqual({ lat: 40.9, lng: -74 });
    expect(shulTodaySchema.safeParse({ lat: '91' }).success).toBe(false);
  });
});
