// The Filters panel's helpers (FR-8): what each choice sends to the server,
// the number on the Filters button, and the chips under the search box.

import { describe, expect, it } from 'vitest';
import { countActive, describe as chips, NO_FILTERS, shiurimCount, toQuery } from '../filters';

describe('FR-8 toQuery: choices to a search request', () => {
  it('sends nothing when nothing is picked', () => {
    expect(toQuery(NO_FILTERS)).toEqual({
      dayOfWeek: undefined,
      afterTime: undefined,
      beforeTime: undefined,
      topic: undefined,
      language: undefined,
      audience: undefined,
    });
  });

  it('turns each time of day into New York times, end not included', () => {
    expect(toQuery({ timePeriod: 'morning' })).toMatchObject({
      afterTime: undefined,
      beforeTime: '12:00',
    });
    expect(toQuery({ timePeriod: 'afternoon' })).toMatchObject({
      afterTime: '12:00',
      beforeTime: '17:00',
    });
    expect(toQuery({ timePeriod: 'evening' })).toMatchObject({
      afterTime: '17:00',
      beforeTime: undefined,
    });
  });

  it('passes the day, topic, language and audience through', () => {
    expect(
      toQuery({ dayOfWeek: 0, topic: 'Gemara', language: 'English', audience: 'Women' }),
    ).toMatchObject({ dayOfWeek: 0, topic: 'Gemara', language: 'English', audience: 'Women' });
  });
});

describe('FR-8 countActive: the number on the Filters button', () => {
  it('counts each group that is set', () => {
    expect(countActive(NO_FILTERS)).toBe(0);
    expect(countActive({ topic: 'Gemara', timePeriod: 'evening' })).toBe(2);
  });

  it('counts Sunday, which is day 0', () => {
    expect(countActive({ dayOfWeek: 0 })).toBe(1);
  });
});

describe('FR-8 describe: the chips under the search box', () => {
  it('gives one chip per choice, in a fixed order', () => {
    expect(
      chips({
        audience: 'Women',
        topic: 'Gemara',
        timePeriod: 'afternoon',
        dayOfWeek: 6,
        language: 'Yiddish',
      }),
    ).toEqual([
      { key: 'dayOfWeek', label: 'Sat' },
      { key: 'timePeriod', label: 'Afternoon' },
      { key: 'topic', label: 'Gemara' },
      { key: 'language', label: 'Yiddish' },
      { key: 'audience', label: 'Women' },
    ]);
  });

  it('shows Sunday, and nothing when nothing is picked', () => {
    expect(chips({ dayOfWeek: 0 })).toEqual([{ key: 'dayOfWeek', label: 'Sun' }]);
    expect(chips(NO_FILTERS)).toEqual([]);
  });
});

describe('shiurimCount', () => {
  it('says "shiur" for one and "shiurim" otherwise', () => {
    expect(shiurimCount(1)).toBe('1 shiur');
    expect(shiurimCount(0)).toBe('0 shiurim');
    expect(shiurimCount(5)).toBe('5 shiurim');
  });
});
