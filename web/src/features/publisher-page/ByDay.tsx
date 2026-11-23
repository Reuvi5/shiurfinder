// A list of shiurim grouped under day headings: "Today", "Tomorrow", "Wed, Nov 25".
//
// Days are New York days, like everywhere else on the site, so a 10pm shiur
// stays on its own day for a user in another time zone.

import type { ShiurListItem } from '@shiurfinder/shared';
import { ShiurRow } from '../../components/ShiurRow';

const TIME_ZONE = 'America/New_York';
const DAY_MS = 24 * 60 * 60 * 1000;

export function ByDay({
  items,
  hide,
  empty,
}: {
  /** soonest first, as the server sends them */
  items: ShiurListItem[];
  /** passed to ShiurRow, to leave out a name the page already shows */
  hide?: 'shul' | 'maggidShiur';
  /** shown when there's nothing */
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="space-y-5">
      {groupByDay(items).map(({ day, label, rows }) => (
        <div key={day}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </h3>
          <div className="space-y-2">
            {rows.map((item) => (
              <ShiurRow key={item.occurrenceId} item={item} hide={hide} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Splits the list into days, keeping the order. The items are already sorted by time. */
function groupByDay(items: ShiurListItem[]) {
  const today = dayKey(new Date());
  const tomorrow = dayKey(new Date(Date.now() + DAY_MS));
  const groups: { day: string; label: string; rows: ShiurListItem[] }[] = [];

  for (const item of items) {
    const date = new Date(item.startsAt);
    const day = dayKey(date);
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      const label = day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : dayLabel(date);
      group = { day, label, rows: [] };
      groups.push(group);
    }
    group.rows.push(item);
  }
  return groups;
}

/** The New York date as "2026-11-25", for comparing days. */
function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

/** e.g. "Wed, Nov 25" */
function dayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
