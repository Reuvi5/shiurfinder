// Turning New York times into UTC, in TypeScript. The database stores UTC;
// users see and enter New York time (CLAUDE.md, "Times").
//
// In SQL, use STARTS_AT_NY (map.queries.ts) and nyMoment (portal.queries.ts)
// instead. This one is for code that builds dates itself, like seed.ts.

/**
 * A New York wall-clock time on a given day, as a UTC Date.
 * `day`'s year, month and date are read on this computer's calendar.
 *
 * Works out New York's offset on that date instead of hardcoding -5, so it
 * stays right across daylight-saving changes (a 10am shiur stays at 10am).
 */
export function nyTimeToUtc(day: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);

  // The time as if New York were UTC, then moved by New York's offset.
  const naive = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
  const guess = naive + nyOffsetMinutes(naive) * 60_000;

  // Checked a second time at the guess: on the day the clocks change, the
  // offset at `naive` can be the wrong one (5am would come out as 4am).
  return new Date(naive + nyOffsetMinutes(guess) * 60_000);
}

/** How far behind UTC New York is at a moment, in minutes (300 or 240). */
function nyOffsetMinutes(at: number): number {
  const utc = new Date(new Date(at).toLocaleString('en-US', { timeZone: 'UTC' }));
  const ny = new Date(new Date(at).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return Math.round((utc.getTime() - ny.getTime()) / 60_000);
}
