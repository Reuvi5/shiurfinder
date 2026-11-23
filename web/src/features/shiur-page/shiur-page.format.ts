// Turns a ShiurDetails into the words and links the shiur popup shows:
// the date and time lines, the "Starts in 20 min" badge, and the calendar,
// Directions and Share links. No components here, see ShiurInfo.tsx.

import type { ShiurDetails } from '@shiurfinder/shared';

/** Used for the calendar end time when the publisher gave no length. */
const DEFAULT_LENGTH_MINUTES = 60;

/** "Starts in N min" only shows this close to the start, like the side panel's badge. */
const STARTS_SOON_MINUTES = 60;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------- words

/** e.g. "Tue, Oct 13 · 2 Cheshvan". Always New York time, wherever the user is. */
export function formatDate(details: ShiurDetails): string {
  const date = new Date(details.startsAt).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${date} · ${details.hebrewDate}`;
}

/** e.g. "8:00 PM – 9:30 PM (1 hr 30 min)", or just "8:00 PM" with no length. */
export function formatTime(details: ShiurDetails): string {
  const start = new Date(details.startsAt);
  if (details.lengthMinutes === null) {
    return clock(start);
  }
  const end = new Date(start.getTime() + details.lengthMinutes * 60_000);
  return `${clock(start)} – ${clock(end)} (${formatLength(details.lengthMinutes)})`;
}

/** A weekly shiur's days, e.g. "Every Sun, Mon & Wed". null for a featured shiur. */
export function formatDays(days: number[]): string | null {
  if (days.length === 0) return null;
  if (days.length === 7) return 'Every day';
  const names = [...days].sort((a, b) => a - b).map((day) => DAY_NAMES[day]);
  const last = names.pop();
  return `Every ${names.length > 0 ? `${names.join(', ')} & ${last}` : last}`;
}

/** e.g. "45 min", "1 hr", "1 hr 30 min". */
export function formatLength(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** e.g. "Beth Aaron · 950 Queen Anne Rd, Teaneck, NJ". */
export function formatPlace(details: ShiurDetails): string | null {
  const parts = [details.shul?.name, details.shul?.address].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ---------------------------------------------------------------- now, soon, over

/**
 * Where this date is right now, for the badge and the "has passed" note.
 *   soon:    starts within the hour
 *   now:     started and not over. minutesLeft is null when we don't know the
 *            length; we don't guess one, so it then just says "Started".
 *   over:    ended. With no length, that's once its New York day is over.
 *   later:   further away than that
 */
export type Timing =
  | { kind: 'soon'; minutes: number }
  | { kind: 'now'; minutesLeft: number | null }
  | { kind: 'over' }
  | { kind: 'later' };

export function timing(details: ShiurDetails, now: number): Timing {
  const start = new Date(details.startsAt).getTime();

  if (now < start) {
    const minutes = Math.ceil((start - now) / 60_000);
    return minutes <= STARTS_SOON_MINUTES ? { kind: 'soon', minutes } : { kind: 'later' };
  }

  if (details.lengthMinutes !== null) {
    const end = start + details.lengthMinutes * 60_000;
    return now < end
      ? { kind: 'now', minutesLeft: Math.ceil((end - now) / 60_000) }
      : { kind: 'over' };
  }

  return nyDay(start) === nyDay(now) ? { kind: 'now', minutesLeft: null } : { kind: 'over' };
}

/** The New York calendar day of a moment, e.g. "2026-11-22" (en-CA writes dates that way). */
function nyDay(time: number): string {
  return new Date(time).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function clock(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------- links

/** The full page for this date. This is what Share sends. */
export function shiurPageUrl(occurrenceId: string): string {
  return `${window.location.origin}/shiur/${occurrenceId}`;
}

/** Opens Google Maps directions to the building, or null if we don't know where it is. */
export function directionsUrl(details: ShiurDetails): string | null {
  // The address finds the right building entrance better than a map point.
  const destination =
    details.shul?.address ??
    (details.lat !== null && details.lng !== null ? `${details.lat},${details.lng}` : null);
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Opens Google Calendar with the event filled in. */
export function googleCalendarUrl(details: ShiurDetails): string {
  const event = calendarEvent(details);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    details: event.about,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/**
 * A calendar file (.ics) for Apple Calendar and Outlook: the same event as
 * the Google link, written in the standard calendar format (RFC 5545). The
 * browser makes it, so no server call. Lines end in CRLF, as the format requires.
 */
export function calendarFile(details: ShiurDetails): string {
  const event = calendarEvent(details);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ShiurFinder//EN',
    'BEGIN:VEVENT',
    // Same id every time, so adding the same date twice updates it instead of duplicating.
    `UID:${details.occurrenceId}@shiurfinder`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${icsText(details.title)}`,
    `DESCRIPTION:${icsText(event.about)}`,
    `LOCATION:${icsText(event.location)}`,
    `URL:${shiurPageUrl(details.occurrenceId)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(foldLine)
    .join('\r\n');
}

/** What both calendar buttons put in the event. */
function calendarEvent(details: ShiurDetails) {
  const start = new Date(details.startsAt);
  const length = details.lengthMinutes ?? DEFAULT_LENGTH_MINUTES;
  return {
    start,
    end: new Date(start.getTime() + length * 60_000),
    about: [details.maggidShiur?.name, details.description, shiurPageUrl(details.occurrenceId)]
      .filter(Boolean)
      .join('\n\n'),
    location: [details.shul?.name, details.room, details.shul?.address].filter(Boolean).join(', '),
  };
}

/**
 * UTC written as 20261013T000000Z: toISOString() without - : and the
 * milliseconds. Both calendar formats want this; getting it wrong puts the
 * event at the wrong hour.
 */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

/** Calendar files treat \ ; , and line breaks as special, so each gets a \ before it. */
function icsText(text: string): string {
  return text.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, '\\n');
}

/** Lines may be at most 75 characters; a longer one continues on a line starting with a space. */
function foldLine(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join('\r\n ');
}
