// What a report may contain (FR-16): one of the SRS's three reasons, and a
// write-in that "Other" needs.

import { describe, expect, it } from 'vitest';
import { MAX_DETAILS_LENGTH } from '../reports.constants';
import { newReportSchema } from '../reports.validation';

describe('FR-16 report input', () => {
  it('takes each of the three reasons', () => {
    for (const reason of ['MAGGID_SHIUR_UNAVAILABLE', 'SHUL_CLOSED'] as const) {
      expect(newReportSchema.parse({ reason })).toEqual({ reason });
    }
    expect(newReportSchema.parse({ reason: 'OTHER', details: 'Moved upstairs' })).toEqual({
      reason: 'OTHER',
      details: 'Moved upstairs',
    });
  });

  it('refuses a reason that is not on the list', () => {
    expect(newReportSchema.safeParse({ reason: 'SWITCHED_TIME' }).success).toBe(false);
    expect(newReportSchema.safeParse({}).success).toBe(false);
  });

  it('needs a write-in for Other, and blank or spaces do not count', () => {
    for (const details of [undefined, '', '   ']) {
      const result = newReportSchema.safeParse({ reason: 'OTHER', details });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.path).toEqual(['details']);
    }
  });

  it('trims the write-in', () => {
    expect(newReportSchema.parse({ reason: 'OTHER', details: '  Moved  ' }).details).toBe('Moved');
  });

  it(`takes a write-in of ${MAX_DETAILS_LENGTH} characters but not one more`, () => {
    const at = (length: number) =>
      newReportSchema.safeParse({ reason: 'OTHER', details: 'x'.repeat(length) }).success;
    expect(at(MAX_DETAILS_LENGTH)).toBe(true);
    expect(at(MAX_DETAILS_LENGTH + 1)).toBe(false);
  });
});
