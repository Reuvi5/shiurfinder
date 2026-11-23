// Fixed numbers the publisher portal uses. Change them here, not inline.

/**
 * A new weekly shiur gets this many weeks of dates right away, the same as
 * the seed. The nightly job in the design doc will keep them topped up.
 */
export const WEEKLY_WEEKS_AHEAD = 8;

/** The shiur's length when the publisher doesn't give one (matches schema.prisma). */
export const DEFAULT_DURATION_MINUTES = 60;
