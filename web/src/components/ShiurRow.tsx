// One shiur in a list: title, who and where, when, distance, and a badge.
//
// Display only: it gets a ShiurListItem and shows it. It fetches nothing, so
// it can be reused anywhere a shiur is listed (the map, a shul page, My Schedule, ...).
//
// Clicking it opens the shiur page (FR-9), unless the caller passes onSelect
// (the map uses that to highlight the shul's pin instead).

import { Link } from '@tanstack/react-router';
import type { ShiurListItem } from '@shiurfinder/shared';

const ROW_CLASS =
  'block w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900';

export function ShiurRow({ item, onSelect }: { item: ShiurListItem; onSelect?: () => void }) {
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={ROW_CLASS}>
        <RowContent item={item} />
      </button>
    );
  }
  return (
    <Link to="/shiur/$id" params={{ id: item.occurrenceId }} className={ROW_CLASS}>
      <RowContent item={item} />
    </Link>
  );
}

/** What the row shows. Same whether it's a link or a button. */
function RowContent({ item }: { item: ShiurListItem }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium leading-snug">{item.title}</h3>
        <StatusBadge item={item} />
      </div>

      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {item.maggidShiur?.name && <span>{item.maggidShiur.name} · </span>}
        {item.shul?.name}
        {item.room && <span> · {item.room}</span>}
      </p>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
        {formatTime(item.startsAt)}
        {item.distanceMiles !== undefined && <span> · {item.distanceMiles.toFixed(1)} mi</span>}
        {item.topic && <span> · {item.topic}</span>}
      </p>
    </>
  );
}

/** At most one badge. The first rule that matches wins: Cancelled, Reported, Now, "in N min", New. */
function StatusBadge({ item }: { item: ShiurListItem }) {
  if (item.status === 'CANCELLED') {
    return <Badge tone="red">Cancelled</Badge>;
  }
  if (item.status === 'REPORTED') {
    return <Badge tone="amber">Reported</Badge>;
  }

  // minutesUntilStart is negative once it has started. "Now" lasts 90 minutes.
  const minutes = item.minutesUntilStart;
  if (minutes !== null && minutes <= 0 && minutes > -90) {
    return <Badge tone="green">Now</Badge>;
  }
  if (minutes !== null && minutes > 0 && minutes <= 60) {
    return <Badge tone="green">in {minutes} min</Badge>;
  }
  if (item.isNew) {
    return <Badge tone="blue">New</Badge>;
  }
  return null;
}

const TONES = {
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
} as const;

function Badge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** e.g. "Mon 8:00 PM". Always New York time, wherever the user is. */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
