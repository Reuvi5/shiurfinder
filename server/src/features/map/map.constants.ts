// Fixed numbers the map feature uses. Change them here, not inline.

export const METERS_PER_MILE = 1609.344;

/** Search radius when the request doesn't give one. */
export const DEFAULT_RADIUS_MILES = 10;

/** The map only shows shiurim happening in the next 7 days. */
export const MAP_WINDOW_DAYS = 7;

/** A shiur is labelled "New" for 72 hours after it is posted. */
export const NEW_LABEL_HOURS = 72;

/**
 * Only shiurim starting within the next 24 hours get a minutesUntilStart value
 * (the website uses it for the "Now" / "in 20 min" badges). Further out, it's null.
 */
export const BADGE_WINDOW_MINUTES = 24 * 60;
