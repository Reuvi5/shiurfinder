// The Filters panel's choices, and helpers for showing them.
//
// The user picks things like "Evening"; the server wants afterTime=17:00.
// toQuery() is the one place that translates between the two.

import type { MapSearchQuery } from '@shiurfinder/shared';

/** What the user picked in the Filters panel. At most one value per group. */
export interface Filters {
  dayOfWeek?: number;
  timePeriod?: TimePeriod;
  topic?: string;
  language?: string;
  audience?: string;
}

export const NO_FILTERS: Filters = {};

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

/** The time-of-day choices, in New York time. `before` is not included (Morning = up to 11:59). */
export const TIME_PERIODS: Record<
  TimePeriod,
  { label: string; hint: string; after?: string; before?: string }
> = {
  morning: { label: 'Morning', hint: 'before 12pm', before: '12:00' },
  afternoon: { label: 'Afternoon', hint: '12–5pm', after: '12:00', before: '17:00' },
  evening: { label: 'Evening', hint: 'after 5pm', after: '17:00' },
};

/** 0 = Sunday, matching the server's dayOfWeek. */
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Turn the user's choices into the filter part of a /map/search request. */
export function toQuery(filters: Filters): Omit<MapSearchQuery, 'lat' | 'lng'> {
  const period = filters.timePeriod ? TIME_PERIODS[filters.timePeriod] : undefined;
  return {
    dayOfWeek: filters.dayOfWeek,
    afterTime: period?.after,
    beforeTime: period?.before,
    topic: filters.topic,
    language: filters.language,
    audience: filters.audience,
  };
}

/** How many filter groups are set — the number on the Filters button. */
export function countActive(filters: Filters): number {
  return Object.values(filters).filter((value) => value !== undefined).length;
}

/** Short labels for the chips under the search box, each with its key so it can be removed. */
export function describe(filters: Filters): { key: keyof Filters; label: string }[] {
  const out: { key: keyof Filters; label: string }[] = [];
  if (filters.dayOfWeek !== undefined)
    out.push({ key: 'dayOfWeek', label: DAYS[filters.dayOfWeek] });
  if (filters.timePeriod)
    out.push({ key: 'timePeriod', label: TIME_PERIODS[filters.timePeriod].label });
  if (filters.topic) out.push({ key: 'topic', label: filters.topic });
  if (filters.language) out.push({ key: 'language', label: filters.language });
  if (filters.audience) out.push({ key: 'audience', label: filters.audience });
  return out;
}

/** "Show 1 shiur" / "Show 5 shiurim". */
export function shiurimCount(n: number): string {
  return `${n} ${n === 1 ? 'shiur' : 'shiurim'}`;
}
