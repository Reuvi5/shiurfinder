// What a shiur page request may contain (FR-9): an optional location only.

import { describe, expect, it } from 'vitest';
import { shiurDetailsSchema } from '../shiur-page.validation';

describe('FR-9 shiur page input', () => {
  it('needs no location', () => {
    expect(shiurDetailsSchema.safeParse({}).success).toBe(true);
  });

  it('turns a location from text into numbers', () => {
    const result = shiurDetailsSchema.safeParse({ lat: '40.9', lng: '-74' });
    expect(result.success && result.data).toEqual({ lat: 40.9, lng: -74 });
  });

  it('rejects a location off the map or not a number', () => {
    expect(shiurDetailsSchema.safeParse({ lat: '-90.5' }).success).toBe(false);
    expect(shiurDetailsSchema.safeParse({ lng: '181' }).success).toBe(false);
    expect(shiurDetailsSchema.safeParse({ lat: 'abc' }).success).toBe(false);
  });
});
