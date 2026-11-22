// Turns a ShiurDetails into the words and links the shiur popup shows:
// the date line, the time line, and the Google Calendar, Directions and
// Share links. No components here, see ShiurInfo.tsx.

import type { ShiurDetails } from '@shiurfinder/shared';

/** Used for the calendar end time when the publisher gave no length. */
const DEFAULT_LENGTH_MINUTES = 60;

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

/**
 * Opens Google Calendar with the event filled in. Google wants UTC times
 * written as 20261013T000000Z, which is toISOString() without - : and the
 * milliseconds. Getting this wrong puts the event at the wrong hour.
 */
export function googleCalendarUrl(details: ShiurDetails): string {
  const start = new Date(details.startsAt);
  const length = details.lengthMinutes ?? DEFAULT_LENGTH_MINUTES;
  const end = new Date(start.getTime() + length * 60_000);
  const googleTime = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');

  const about = [details.maggidShiur?.name, details.description, shiurPageUrl(details.occurrenceId)]
    .filter(Boolean)
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${googleTime(start)}/${googleTime(end)}`,
    details: about,
    location: [details.shul?.name, details.room, details.shul?.address].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
