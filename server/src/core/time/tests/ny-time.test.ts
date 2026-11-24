// nyTimeToUtc: New York wall-clock times in winter, summer, and on the two
// days a year the clocks change.

import { describe, expect, it } from 'vitest';
import { nyTimeToUtc } from '../ny-time';

/** A calendar day. Tests run in UTC, so this is that day on any computer. */
function day(year: number, month: number, date: number): Date {
  return new Date(year, month - 1, date);
}

describe('nyTimeToUtc', () => {
  it('is 5 hours ahead in winter', () => {
    expect(nyTimeToUtc(day(2026, 12, 1), '10:00').toISOString()).toBe('2026-12-01T15:00:00.000Z');
  });

  it('is 4 hours ahead in summer', () => {
    expect(nyTimeToUtc(day(2026, 7, 1), '10:00').toISOString()).toBe('2026-07-01T14:00:00.000Z');
  });

  it('moves an evening shiur to the next UTC day', () => {
    expect(nyTimeToUtc(day(2026, 6, 1), '21:30').toISOString()).toBe('2026-06-02T01:30:00.000Z');
  });

  it('keeps midnight on the same New York day', () => {
    expect(nyTimeToUtc(day(2026, 6, 1), '00:00').toISOString()).toBe('2026-06-01T04:00:00.000Z');
  });

  describe('the day the clocks go back (Nov 1, 2026)', () => {
    it('is still summer time just after midnight', () => {
      expect(nyTimeToUtc(day(2026, 11, 1), '00:30').toISOString()).toBe('2026-11-01T04:30:00.000Z');
    });

    it('is winter time by an early-morning shiur', () => {
      expect(nyTimeToUtc(day(2026, 11, 1), '05:00').toISOString()).toBe('2026-11-01T10:00:00.000Z');
    });

    it('is winter time in the evening', () => {
      expect(nyTimeToUtc(day(2026, 11, 1), '20:00').toISOString()).toBe('2026-11-02T01:00:00.000Z');
    });
  });

  describe('the day the clocks go forward (Mar 8, 2026)', () => {
    it('is still winter time just after midnight', () => {
      expect(nyTimeToUtc(day(2026, 3, 8), '00:30').toISOString()).toBe('2026-03-08T05:30:00.000Z');
    });

    it('is summer time by an early-morning shiur', () => {
      expect(nyTimeToUtc(day(2026, 3, 8), '05:00').toISOString()).toBe('2026-03-08T09:00:00.000Z');
    });

    it('is summer time in the evening', () => {
      expect(nyTimeToUtc(day(2026, 3, 8), '20:00').toISOString()).toBe('2026-03-09T00:00:00.000Z');
    });
  });
});
