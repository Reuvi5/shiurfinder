// What every call from the website to the server uses: get(), post(), patch() and del() to send a
// request, and messageFor() to turn an error into words for the user.
//
// The calls themselves live in each feature's folder (e.g. features/map/map.api.ts),
// so two people adding calls never edit the same file.

import type { ApiError } from '@shiurfinder/shared';
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
  SHIUR_NOT_FOUND: 'That shiur could not be found.',
  PUBLISHER_NOT_FOUND: 'That page could not be found.',
  DATE_PASSED: 'That date and time have already passed. Pick a later one.',
  NOT_SIGNED_IN: 'Sign in to do that.',
  NO_PERMISSION: "You don't have permission to do that.",
  TOO_MANY_REQUESTS: 'Too many requests. Wait a moment and try again.',
  // Login (FR-2): Better Auth's own codes (features/account/).
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  EMAIL_NOT_VERIFIED: 'Verify your email first. We just sent you a new link.',
  INVALID_EMAIL: 'That email address is not valid.',
  PASSWORD_TOO_SHORT: 'Your password needs at least 8 characters.',
  PASSWORD_TOO_LONG: 'That password is too long.',
  TOKEN_EXPIRED: 'That link has expired. Sign in to get a new one.',
  INVALID_TOKEN: "That link didn't work. Sign in to get a new one.",
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
export async function get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
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

/** POST JSON to a path on the server and return the JSON reply. Errors work like get(). */
export async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  } catch {
    throw new ApiRequestError('NETWORK', 'Could not reach the server.');
  }

  if (!response.ok) {
    const error: Partial<ApiError> = await response.json().catch(() => ({}));
    throw new ApiRequestError(error.code ?? 'INTERNAL_ERROR', error.message ?? 'Request failed');
  }

  return (await response.json()) as T;
}

/** PATCH JSON to a path (change part of something) and return the JSON reply. Errors work like get(). */
export function patch<T>(path: string, body: unknown): Promise<T> {
  return send<T>('PATCH', path, body);
}

/**
 * DELETE a path and return the JSON reply, or undefined for an empty one
 * (204). Errors work like get(). Named `del` because `delete` is a keyword.
 */
export function del<T = void>(path: string): Promise<T> {
  return send<T>('DELETE', path);
}

/** Sends a request with an optional JSON body, for patch() and del(). */
async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
  } catch {
    throw new ApiRequestError('NETWORK', 'Could not reach the server.');
  }

  if (!response.ok) {
    const error: Partial<ApiError> = await response.json().catch(() => ({}));
    throw new ApiRequestError(error.code ?? 'INTERNAL_ERROR', error.message ?? 'Request failed');
  }

  // A 204 (or any empty reply) has no JSON to read.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
