// The account pages' calls to the server (FR-2): sign up, sign in, sign out,
// and sending the verification link again.
//
// They go through Better Auth's client (core/auth.ts), not core/api.ts. A
// failed call throws ApiRequestError, like every other call, so pages show
// it with messageFor().

import { ApiRequestError } from '../../core/api';
import { authClient } from '../../core/auth';
import { toApiError, type AuthClientError } from './account.errors';
import { verifiedUrl } from './account.search';

/** Runs a Better Auth call and throws if it failed. */
async function call(send: () => Promise<{ error: AuthClientError | null }>): Promise<void> {
  let result: { error: AuthClientError | null };
  try {
    result = await send();
  } catch {
    throw new ApiRequestError('NETWORK', 'Could not reach the server.');
  }
  if (result.error) throw toApiError(result.error);
}

/** Makes the account and emails the verification link. They aren't signed in yet. */
export function signUp(form: { name: string; email: string; password: string }, redirect?: string) {
  return call(() =>
    authClient.signUp.email({
      ...form,
      callbackURL: verifiedUrl(window.location.origin, redirect),
    }),
  );
}

/**
 * Signs in. An unverified email fails with EMAIL_NOT_VERIFIED, and a new link
 * is sent. Without callbackURL, that link would lead to the server's own
 * address instead of back to the website.
 */
export function signIn(form: { email: string; password: string }, redirect?: string) {
  return call(() =>
    authClient.signIn.email({
      ...form,
      callbackURL: verifiedUrl(window.location.origin, redirect),
    }),
  );
}

/** Emails the verification link again. */
export function sendLinkAgain(email: string, redirect?: string) {
  return call(() =>
    authClient.sendVerificationEmail({
      email,
      callbackURL: verifiedUrl(window.location.origin, redirect),
    }),
  );
}

export function signOut() {
  return call(() => authClient.signOut());
}
