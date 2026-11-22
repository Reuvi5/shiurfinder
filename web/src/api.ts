// Every call from the website to the server goes through this file.
//
// To add a new server call: write a small fetchX() function at the bottom
// that uses get(), and type its result with a type from '@shiurfinder/shared'.

import type {
  ApiError,
  FilterOptions,
  MapSearchQuery,
  MapSearchResult,
  ShulTodayResult,
} from '@shiurfinder/shared';
import { API_URL } from './config';

/** Thrown for any failed request. `code` is the server's error code, e.g. 'SHUL_NOT_FOUND'. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** What the user sees for each error code. Unknown codes fall back to INTERNAL_ERROR. */
const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Something about that search was not valid.',
  SHUL_NOT_FOUND: 'That shul could not be found.',
  NOT_SIGNED_IN: 'Sign in to do that.',
  NO_PERMISSION: "You don't have permission to do that.",
  TOO_MANY_REQUESTS: 'Too many requests. Wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong. Try again.',
  NETWORK: 'Something went wrong. Try again.',
};

/** Turns any error into a sentence that's safe to show the user. */
export function messageFor(error: unknown): string {
  const code = error instanceof ApiRequestError ? error.code : 'INTERNAL_ERROR';
  return MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
}

/**
 * GET a path on the server and return the JSON.
 * Params that are undefined, null or '' are left out of the URL.
 */
async function get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}?${query}`, { credentials: 'include' });
  } catch {
    // fetch only throws when it can't reach the server at all.
    throw new ApiRequestError('NETWORK', 'Could not reach the server.');
  }

  if (!response.ok) {
    // The server sends { code, message }. If the body isn't JSON, use a generic error.
    const body: Partial<ApiError> = await response.json().catch(() => ({}));
    throw new ApiRequestError(body.code ?? 'INTERNAL_ERROR', body.message ?? 'Request failed');
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------- server calls

/** Pins plus the Weekly and Featured lists for one search. */
export function fetchMapSearch(query: MapSearchQuery): Promise<MapSearchResult> {
  return get('/map/search', { ...query });
}

/** The choices the Filters panel can offer. */
export function fetchFilterOptions(): Promise<FilterOptions> {
  return get('/map/filters');
}

/** One shul's shiurim for the rest of today. `origin` is only used to show distance. */
export function fetchShulToday(
  publisherId: string,
  origin?: { lat: number; lng: number },
): Promise<ShulTodayResult> {
  return get(`/map/shul/${publisherId}/today`, { lat: origin?.lat, lng: origin?.lng });
}
