// The shiur popup's words and links (FR-9): dates and times in New York
// time, the "starts soon" badge, and the calendar, Directions and Share links.

import type { ShiurDetails } from '@shiurfinder/shared';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  calendarFile,
  directionsUrl,
  formatDate,
  formatDays,
  formatLength,
  formatPlace,
  formatTime,
  googleCalendarUrl,
  shiurPageUrl,
  timing,
} from '../shiur-page.format';

const ORIGIN = 'https://shiurfinder.test';

beforeAll(() => {
  // The links use the site's own address. Tests have no browser, so set one.
  vi.stubGlobal('window', { location: { origin: ORIGIN } });
});

/** 8pm New York on Tue Oct 13, 2026: already Oct 14 in UTC. */
const STARTS_AT = '2026-10-14T00:00:00.000Z';

function shiur(fields: Partial<ShiurDetails> = {}): ShiurDetails {
  return {
    occurrenceId: 'occ-1',
    shiurId: 'shiur-1',
    kind: 'WEEKLY',
    title: 'Daf Yomi',
    description: null,
    startsAt: STARTS_AT,
    hebrewDate: '2 Cheshvan',
    lengthMinutes: 90,
    daysOfWeek: [2],
    status: 'ON',
    reason: null,
    topic: 'Gemara',
    language: 'English',
    audience: null,
    flyerUrl: null,
    shul: { id: 'shul-1', name: 'Beth Aaron', address: '950 Queen Anne Rd, Teaneck, NJ' },
    maggidShiur: { id: 'rav-1', name: 'Rabbi Cohen' },
    room: 'Main Beis Medrash',
    lat: 40.89,
    lng: -74.02,
    distanceMiles: null,
    ...fields,
  };
}

const minutes = (n: number) => n * 60_000;
const START = new Date(STARTS_AT).getTime();

// ---------------------------------------------------------------- words

describe('FR-9 the date and time lines, in New York time', () => {
  it('shows the New York date, not the UTC one', () => {
    expect(formatDate(shiur())).toBe('Tue, Oct 13 · 2 Cheshvan');
  });

  it('shows the start, end and length', () => {
    expect(formatTime(shiur())).toBe('8:00 PM – 9:30 PM (1 hr 30 min)');
  });

  it('shows just the start when there is no length', () => {
    expect(formatTime(shiur({ lengthMinutes: null }))).toBe('8:00 PM');
  });

  it('uses winter time after the clocks change', () => {
    expect(formatTime(shiur({ startsAt: '2026-11-03T01:00:00.000Z', lengthMinutes: null }))).toBe(
      '8:00 PM',
    );
  });
});

describe('FR-9 formatDays', () => {
  it('lists the days in order, joined with "&"', () => {
    expect(formatDays([3, 0, 1])).toBe('Every Sun, Mon & Wed');
    expect(formatDays([4])).toBe('Every Thu');
    expect(formatDays([0, 6])).toBe('Every Sun & Sat');
  });

  it('says "Every day" for all seven, and nothing for a featured shiur', () => {
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(formatDays([])).toBeNull();
  });
});

describe('FR-9 formatLength', () => {
  it('uses minutes under an hour, and hours from there', () => {
    expect(formatLength(45)).toBe('45 min');
    expect(formatLength(60)).toBe('1 hr');
    expect(formatLength(61)).toBe('1 hr 1 min');
    expect(formatLength(150)).toBe('2 hr 30 min');
  });
});

describe('FR-9 formatPlace', () => {
  it('gives the shul and its address, or whichever is known', () => {
    expect(formatPlace(shiur())).toBe('Beth Aaron · 950 Queen Anne Rd, Teaneck, NJ');
    expect(formatPlace(shiur({ shul: { id: 's', name: 'Beth Aaron', address: null } }))).toBe(
      'Beth Aaron',
    );
    expect(formatPlace(shiur({ shul: null }))).toBeNull();
  });
});

// ---------------------------------------------------------------- now, soon, over

describe('FR-9 timing: the badge and the "has passed" note', () => {
  it('is "soon" within the hour before, counting up to the minute', () => {
    expect(timing(shiur(), START - minutes(60))).toEqual({ kind: 'soon', minutes: 60 });
    expect(timing(shiur(), START - minutes(59.5))).toEqual({ kind: 'soon', minutes: 60 });
    expect(timing(shiur(), START - minutes(1))).toEqual({ kind: 'soon', minutes: 1 });
  });

  it('is "later" more than an hour before', () => {
    expect(timing(shiur(), START - minutes(61))).toEqual({ kind: 'later' });
  });

  it('is "now" from the start until the end, with the minutes left', () => {
    expect(timing(shiur(), START)).toEqual({ kind: 'now', minutesLeft: 90 });
    expect(timing(shiur(), START + minutes(89))).toEqual({ kind: 'now', minutesLeft: 1 });
  });

  it('is "over" at the end', () => {
    expect(timing(shiur(), START + minutes(90))).toEqual({ kind: 'over' });
  });

  it('with no length, is "now" until its New York day ends', () => {
    const noLength = shiur({ lengthMinutes: null });
    // 11:59pm New York on the same day.
    expect(timing(noLength, START + minutes(239))).toEqual({ kind: 'now', minutesLeft: null });
    // Midnight New York: the next day.
    expect(timing(noLength, START + minutes(240))).toEqual({ kind: 'over' });
  });
});

// ---------------------------------------------------------------- links

describe('FR-9 the Share and Directions links', () => {
  it("shares the shiur's own page", () => {
    expect(shiurPageUrl('occ-1')).toBe(`${ORIGIN}/shiur/occ-1`);
  });

  it('gives directions to the address, or the map point when there is none', () => {
    expect(directionsUrl(shiur())).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=950%20Queen%20Anne%20Rd%2C%20Teaneck%2C%20NJ',
    );
    expect(directionsUrl(shiur({ shul: null }))).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=40.89%2C-74.02',
    );
  });

  it('has no directions when the place is unknown', () => {
    expect(directionsUrl(shiur({ shul: null, lat: null, lng: null }))).toBeNull();
  });
});

describe('FR-9 the Google Calendar link', () => {
  it('fills in the title, UTC times, details and place', () => {
    const params = new URL(googleCalendarUrl(shiur())).searchParams;
    expect(params.get('action')).toBe('TEMPLATE');
    expect(params.get('text')).toBe('Daf Yomi');
    expect(params.get('dates')).toBe('20261014T000000Z/20261014T013000Z');
    expect(params.get('details')).toBe(`Rabbi Cohen\n\n${ORIGIN}/shiur/occ-1`);
    expect(params.get('location')).toBe(
      'Beth Aaron, Main Beis Medrash, 950 Queen Anne Rd, Teaneck, NJ',
    );
  });

  it('makes it an hour long when there is no length', () => {
    const params = new URL(googleCalendarUrl(shiur({ lengthMinutes: null }))).searchParams;
    expect(params.get('dates')).toBe('20261014T000000Z/20261014T010000Z');
  });
});

describe('FR-9 the calendar file (.ics)', () => {
  /** The file's lines, with long lines joined back together. */
  function lines(file: string): string[] {
    return file.replace(/\r\n /g, '').split('\r\n');
  }

  it('is one event with the UTC start and end', () => {
    const file = lines(calendarFile(shiur()));
    expect(file[0]).toBe('BEGIN:VCALENDAR');
    expect(file).toContain('DTSTART:20261014T000000Z');
    expect(file).toContain('DTEND:20261014T013000Z');
    expect(file).toContain('UID:occ-1@shiurfinder');
    expect(file.at(-1)).toBe('END:VCALENDAR');
  });

  it('ends every line with CRLF', () => {
    expect(calendarFile(shiur())).not.toMatch(/[^\r]\n/);
  });

  it('puts a \\ before , ; \\ and line breaks', () => {
    const file = lines(calendarFile(shiur({ title: 'Shabbos; Yom Tov, and \\ more' })));
    expect(file).toContain('SUMMARY:Shabbos\\; Yom Tov\\, and \\\\ more');
    expect(file.find((line) => line.startsWith('DESCRIPTION:'))).toBe(
      `DESCRIPTION:Rabbi Cohen\\n\\n${ORIGIN}/shiur/occ-1`,
    );
  });

  it('splits lines longer than 75 characters', () => {
    const file = calendarFile(shiur({ title: 'A'.repeat(200) }));
    for (const line of file.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    expect(lines(file)).toContain(`SUMMARY:${'A'.repeat(200)}`);
  });
});
