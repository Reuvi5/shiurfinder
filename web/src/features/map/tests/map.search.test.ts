// parseMapSearch (FR-9): which pin and shiur a map link opens.

import { describe, expect, it } from 'vitest';
import { parseMapSearch } from '../map.search';

describe('FR-9 the map link', () => {
  it('keeps the open shul and shiur', () => {
    expect(parseMapSearch({ shul: 'abc', shiur: 'xyz' })).toEqual({ shul: 'abc', shiur: 'xyz' });
  });

  it('opens nothing when neither is there', () => {
    expect(parseMapSearch({})).toEqual({ shul: undefined, shiur: undefined });
  });

  it('drops anything that is not plain text, instead of crashing', () => {
    expect(parseMapSearch({ shul: ['x'], shiur: 42 })).toEqual({
      shul: undefined,
      shiur: undefined,
    });
  });

  it('ignores params it does not know', () => {
    expect(parseMapSearch({ shul: 'abc', other: 'x' })).toEqual({ shul: 'abc', shiur: undefined });
  });
});
