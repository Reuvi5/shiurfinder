// Reporting's words (FR-16): the three reasons, the "unverified report"
// notice, and when the Report button stops being offered.

import type { OpenReport, ShiurDetails } from '@shiurfinder/shared';
import { describe, expect, it } from 'vitest';
import { canReport, noticeReasons, noticeTitle, REASON_CHOICES } from '../reports.format';

/** 8pm New York on Tue Dec 1, 2026. */
const STARTS_AT = '2026-12-02T01:00:00.000Z';
const START = new Date(STARTS_AT).getTime();
const MINUTE = 60_000;

function shiur(fields: Partial<ShiurDetails> = {}): ShiurDetails {
  return {
    occurrenceId: 'occ-1',
    shiurId: 'shiur-1',
    kind: 'WEEKLY',
    title: 'Daf Yomi',
    description: null,
    startsAt: STARTS_AT,
    hebrewDate: '1 Kislev',
    lengthMinutes: 60,
    daysOfWeek: [2],
    status: 'ON',
    reason: null,
    topic: null,
    language: null,
    audience: null,
    flyerUrl: null,
    shul: null,
    maggidShiur: null,
    room: null,
    lat: null,
    lng: null,
    distanceMiles: null,
    ...fields,
  };
}

function report(reason: string): OpenReport {
  return { reason, reportedAt: STARTS_AT };
}

describe('FR-16 the reasons', () => {
  it('offers the SRS’s three reasons, Other last', () => {
    expect(REASON_CHOICES.map((choice) => choice.label)).toEqual([
      'Maggid shiur unavailable',
      'Shul closed',
      'Other',
    ]);
  });
});

describe('FR-16 the unverified report notice', () => {
  it('says "Unverified report" for one and counts more', () => {
    expect(noticeTitle(1)).toBe('Unverified report');
    expect(noticeTitle(3)).toBe('3 unverified reports');
  });

  it('lists each reason once, newest first, counting repeats', () => {
    const reports = [report('Shul closed'), report('Other: Moved upstairs'), report('Shul closed')];
    expect(noticeReasons(reports)).toEqual(['Shul closed (2)', 'Other: Moved upstairs']);
  });

  it('lists nothing when there are no reports', () => {
    expect(noticeReasons([])).toEqual([]);
  });
});

describe('FR-16 when the Report button shows', () => {
  it('shows before the shiur and while it is under way', () => {
    expect(canReport(shiur(), START - 24 * 60 * MINUTE)).toBe(true);
    expect(canReport(shiur(), START + 59 * MINUTE)).toBe(true);
  });

  it('hides the minute a 60-minute shiur ends, and after', () => {
    expect(canReport(shiur(), START + 60 * MINUTE)).toBe(false);
    expect(canReport(shiur(), START + 61 * MINUTE)).toBe(false);
  });

  it('counts a shiur with no length as 60 minutes', () => {
    const noLength = shiur({ lengthMinutes: null });
    expect(canReport(noLength, START + 59 * MINUTE)).toBe(true);
    expect(canReport(noLength, START + 60 * MINUTE)).toBe(false);
  });

  it('uses the shiur’s own length', () => {
    const long = shiur({ lengthMinutes: 90 });
    expect(canReport(long, START + 89 * MINUTE)).toBe(true);
    expect(canReport(long, START + 90 * MINUTE)).toBe(false);
  });

  it('hides for a cancelled date, even before it starts', () => {
    expect(canReport(shiur({ status: 'CANCELLED' }), START - MINUTE)).toBe(false);
  });

  it('still shows for a date someone already reported or the publisher changed', () => {
    expect(canReport(shiur({ status: 'REPORTED' }), START - MINUTE)).toBe(true);
    expect(canReport(shiur({ status: 'CHANGED' }), START - MINUTE)).toBe(true);
  });
});
