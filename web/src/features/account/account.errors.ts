// Better Auth's errors, as the same ApiRequestError every other call throws,
// so messageFor() (core/api.ts) words them for the user.
//
// Kept apart from account.api.ts so it can be tested without a server.

import { ApiRequestError } from '../../core/api';

/** What Better Auth's client returns when a call fails. */
export interface AuthClientError {
  code?: string;
  message?: string;
  status: number;
}

/** The error to throw for a failed call. A 429 has no code, so it gets ours. */
export function toApiError(error: AuthClientError): ApiRequestError {
  const code = error.code ?? (error.status === 429 ? 'TOO_MANY_REQUESTS' : 'INTERNAL_ERROR');
  return new ApiRequestError(code, error.message ?? 'Request failed');
}

/**
 * Why a verification link failed, from the ?error= the server adds. An
 * expired link says so; anything else (edited, already used) is "didn't work".
 */
export function linkError(code: string): ApiRequestError {
  return new ApiRequestError(code === 'TOKEN_EXPIRED' ? code : 'INVALID_TOKEN', code);
}
