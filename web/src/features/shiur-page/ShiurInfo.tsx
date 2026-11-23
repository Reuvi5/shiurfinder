// Everything about one date of a shiur, plus its buttons (FR-9).
//
// Display only: it gets a ShiurDetails and shows it. ShiurCard (on the map)
// and ShiurPage (its own web address) both use it, so they always match.

import { useEffect, useState } from 'react';
import type { ShiurDetails } from '@shiurfinder/shared';
import {
  calendarFile,
  directionsUrl,
  formatDate,
  formatDays,
  formatPlace,
  formatTime,
  googleCalendarUrl,
  shiurPageUrl,
  timing,
  type Timing,
} from './shiur-page.format';

/** How often the badge re-checks the clock, so "in 20 min" counts down. */
const TICK_MS = 30_000;

export function ShiurInfo({ details }: { details: ShiurDetails }) {
  const place = formatPlace(details);
  const days = formatDays(details.daysOfWeek);
  const now = useNow();
  const when = timing(details, now);

  return (
    <article className="space-y-4">
      {details.flyerUrl && <Flyer url={details.flyerUrl} title={details.title} />}

      <header>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {details.kind === 'WEEKLY' ? 'Weekly shiur' : 'Featured shiur'}
          </p>
          {details.status !== 'CANCELLED' && <TimingBadge when={when} />}
        </div>
        <h2 className="text-xl font-semibold leading-snug">{details.title}</h2>
        {details.maggidShiur && (
          <p className="text-slate-700 dark:text-slate-300">{details.maggidShiur.name}</p>
        )}
      </header>

      <StatusNotice details={details} when={when} />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <Fact label="When">
          {formatDate(details)}
          {days && <span className="block text-xs text-slate-500">{days}</span>}
        </Fact>
        <Fact label="Time">{formatTime(details)}</Fact>
        {place && <Fact label="Where">{place}</Fact>}
        {details.room && <Fact label="Room">{details.room}</Fact>}
        {details.distanceMiles !== null && (
          <Fact label="Distance">{details.distanceMiles.toFixed(1)} mi</Fact>
        )}
        {details.topic && <Fact label="Topic">{details.topic}</Fact>}
        {details.audience && <Fact label="Audience">{details.audience}</Fact>}
        {details.language && <Fact label="Language">{details.language}</Fact>}
      </dl>

      {details.description && (
        // whitespace-pre-line keeps the publisher's line breaks.
        <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
          {details.description}
        </p>
      )}

      <Buttons details={details} />
    </article>
  );
}

// ---------------------------------------------------------------- pieces

/** The current time, updated every TICK_MS, so the badge stays right while the popup is open. */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** "Starts in 20 min", "Now · 25 min left", or "Started" (length unknown). Nothing otherwise. */
function TimingBadge({ when }: { when: Timing }) {
  let text: string | null = null;
  if (when.kind === 'soon') text = `Starts in ${when.minutes} min`;
  if (when.kind === 'now') {
    text = when.minutesLeft === null ? 'Started' : `Now · ${when.minutesLeft} min left`;
  }
  if (!text) return null;

  return (
    <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      {text}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Hides itself if the image fails to load, instead of showing a broken picture. */
function Flyer({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={url}
      alt={`Flyer for ${title}`}
      onError={() => setFailed(true)}
      className="max-h-80 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-900"
    />
  );
}

/** Cancelled, changed, reported, or already over. Nothing when it's on as planned. */
function StatusNotice({ details, when }: { details: ShiurDetails; when: Timing }) {
  const reason = details.reason ? ` ${details.reason}` : '';

  if (details.status === 'CANCELLED') {
    return <Notice tone="red">This date is cancelled.{reason}</Notice>;
  }
  if (details.status === 'CHANGED') {
    return <Notice tone="amber">This date was changed.{reason}</Notice>;
  }
  if (details.status === 'REPORTED') {
    return <Notice tone="amber">Reported as not happening, not confirmed yet.</Notice>;
  }
  if (when.kind === 'over') {
    return <Notice tone="slate">This date has passed.</Notice>;
  }
  return null;
}

const TONES = {
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
} as const;

function Notice({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return <p className={`rounded-lg p-3 text-sm ${TONES[tone]}`}>{children}</p>;
}

// ---------------------------------------------------------------- buttons

const PRIMARY =
  'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300';
const SECONDARY =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900';
const DISABLED =
  'rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-800 dark:text-slate-600';

/** Save, the two calendar buttons, Directions, Share, Report (FR-9). */
function Buttons({ details }: { details: ShiurDetails }) {
  const directions = directionsUrl(details);

  return (
    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
      {/* Saving and reporting need an account (FR-1), so they stay off until accounts are built. */}
      <button
        type="button"
        disabled
        title="Sign in to save. Coming with accounts."
        className={DISABLED}
      >
        Save
      </button>
      <a href={googleCalendarUrl(details)} target="_blank" rel="noreferrer" className={SECONDARY}>
        Add to Google Calendar
      </a>
      <button type="button" onClick={() => downloadCalendarFile(details)} className={SECONDARY}>
        Apple / Outlook
      </button>
      {directions && (
        <a href={directions} target="_blank" rel="noreferrer" className={PRIMARY}>
          Directions
        </a>
      )}
      <ShareButton details={details} />
      <button
        type="button"
        disabled
        title="Sign in to report. Coming with accounts."
        className={DISABLED}
      >
        Report
      </button>
    </div>
  );
}

/**
 * Uses the phone's share sheet when there is one; otherwise copies the link.
 * The link is always the full page (/shiur/:id), which works for someone
 * who never opened the map.
 */
function ShareButton({ details }: { details: ShiurDetails }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = shiurPageUrl(details.occurrenceId);
    if (navigator.share) {
      // Throws if the user closes the share sheet, which isn't an error.
      await navigator.share({ title: details.title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} className={SECONDARY}>
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

/**
 * Saves the .ics file. Opening it adds the shiur in Apple Calendar or
 * Outlook. Made in the browser, so no server call.
 */
function downloadCalendarFile(details: ShiurDetails) {
  const file = new Blob([calendarFile(details)], { type: 'text/calendar' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${details.title.replace(/[^\w ]+/g, '').trim() || 'shiur'}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
