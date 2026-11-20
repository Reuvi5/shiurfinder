import type {
  ApiError,
  FilterOptions,
  MapSearchQuery,
  MapSearchResult,
  ShulTodayResult,
} from '@shiurfinder/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Thrown for any non-2xx response. Carries the server's error `code` so the UI
 * can look up its own friendlier wording (SDD, Errors) instead of showing
 * whatever the server said.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** What the user actually sees for a given error code. */
const MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Something about that search was not valid.',
  SHUL_NOT_FOUND: 'That shul could not be found.',
  NOT_SIGNED_IN: 'Sign in to do that.',
  NO_PERMISSION: "You don't have permission to do that.",
  TOO_MANY_REQUESTS: 'Too many requests. Wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong. Try again.',
  NETWORK: 'Something went wrong. Try again.',
};

export function messageFor(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return MESSAGES[error.code] ?? MESSAGES.INTERNAL_ERROR;
  }
  return MESSAGES.INTERNAL_ERROR;
}

async function get<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}?${query.toString()}`, {
      credentials: 'include',
    });
  } catch {
    // The server is unreachable — a different thing from the server saying no.
    throw new ApiRequestError('NETWORK', 'Could not reach the server.');
  }

  if (!response.ok) {
    let body: Partial<ApiError> = {};
    try {
      body = (await response.json()) as ApiError;
    } catch {
      // Error body wasn't JSON. Fall through to the generic code below.
    }
    throw new ApiRequestError(body.code ?? 'INTERNAL_ERROR', body.message ?? 'Request failed');
  }

  return (await response.json()) as T;
}

/** UC-1 steps 5-7. */
export function fetchMapSearch(query: MapSearchQuery): Promise<MapSearchResult> {
  return get<MapSearchResult>('/map/search', { ...query });
}

/** FR-8: the choices the Filters panel offers. */
export function fetchFilterOptions(): Promise<FilterOptions> {
  return get<FilterOptions>('/map/filters', {});
}

/** UC-1 steps 10-11. */
export function fetchShulToday(
  publisherId: string,
  origin?: { lat: number; lng: number },
): Promise<ShulTodayResult> {
  return get<ShulTodayResult>(`/map/shul/${publisherId}/today`, {
    lat: origin?.lat,
    lng: origin?.lng,
  });
}
