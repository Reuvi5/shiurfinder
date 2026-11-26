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

/** The ?error= Better Auth adds after Google sign-in fails, and what it means for us. */
const GOOGLE_ERRORS: Record<string, string> = {
  // The email has an account that isn't verified, so it can't be linked.
  account_not_linked: 'GOOGLE_NOT_LINKED',
  // They pressed Cancel on Google's page.
  access_denied: 'GOOGLE_CANCELLED',
};

/** Verification link errors are upper case (TOKEN_EXPIRED); Google sign-in's are lower case. */
const LINK_ERROR = /^[A-Z_]+$/;

/**
 * Why coming back to /sign-in failed, from the ?error= the server adds: a
 * verification link (expired, or edited or used) or Google sign-in.
 */
export function redirectError(code: string): ApiRequestError {
  if (LINK_ERROR.test(code)) {
    return new ApiRequestError(code === 'TOKEN_EXPIRED' ? code : 'INVALID_TOKEN', code);
  }
  return new ApiRequestError(GOOGLE_ERRORS[code] ?? 'GOOGLE_FAILED', code);
}

/**
 * A reset failure in words for the reset page. A bad link there means "ask
 * for a new one", not "sign in" (which is what INVALID_TOKEN says elsewhere).
 */
export function resetError(error: unknown): unknown {
  return error instanceof ApiRequestError && error.code === 'INVALID_TOKEN'
    ? new ApiRequestError('RESET_LINK_INVALID', error.message)
    : error;
}
