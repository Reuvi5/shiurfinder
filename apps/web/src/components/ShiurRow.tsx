import type { ShiurListItem } from '@shiurfinder/shared';

/**
 * One row in the Featured or Weekly list.
 *
 * Presentation only — it takes a ShiurListItem and renders it. It fetches
 * nothing and decides nothing, so it can be dropped into My Schedule, a shul
 * page or search results without change.
 */
export function ShiurRow({ item, onSelect }: { item: ShiurListItem; onSelect?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
    >
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
        {formatTime(item.startsAt)} · {item.distanceMiles.toFixed(1)} mi
        {item.topic && <span> · {item.topic}</span>}
      </p>
    </button>
  );
}

/** "Cancelled", "Now", "in 20 min", "New" — in that order of importance. */
function StatusBadge({ item }: { item: ShiurListItem }) {
  if (item.status === 'CANCELLED') {
    return <Badge tone="red">Cancelled</Badge>;
  }
  if (item.status === 'REPORTED') {
    return <Badge tone="amber">Reported</Badge>;
  }

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

/** All times are New York (Figure 2 notes). */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
