// The account pages' calls to the server: signing up, in and out (FR-2),
// and the settings (FR-4).
//
// Login goes through Better Auth's client (core/auth.ts); settings through
// core/api.ts. Either way a failed call throws ApiRequestError, so pages show
// it with messageFor().

import { useQuery } from '@tanstack/react-query';
import type { AccountChanges, AccountSettings } from '@shiurfinder/shared';
import { ApiRequestError, del, get, patch } from '../../core/api';
import { authClient } from '../../core/auth';
import { toApiError, type AuthClientError } from './account.errors';
import { afterSignInUrl } from './account.search';

// ------------- login (Better Auth)

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

/**
 * Makes the account and emails the verification link. They aren't signed in
 * yet. `darkMode` is the guest's choice, carried into the account.
 */
export function signUp(
  form: { name: string; email: string; password: string; darkMode: boolean },
  redirect?: string,
) {
  return call(() =>
    authClient.signUp.email({
      ...form,
      callbackURL: afterSignInUrl(window.location.origin, redirect),
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
      callbackURL: afterSignInUrl(window.location.origin, redirect),
    }),
  );
}

/** Emails the verification link again. */
export function sendLinkAgain(email: string, redirect?: string) {
  return call(() =>
    authClient.sendVerificationEmail({
      email,
      callbackURL: afterSignInUrl(window.location.origin, redirect),
    }),
  );
}

/**
 * Sends the browser to Google's sign-in page. Google sends it back through
 * our server to /sign-in, signed in, or with ?error= if it didn't work.
 * Fails here with PROVIDER_NOT_FOUND when the server has no Google key.
 */
export function signInWithGoogle(redirect?: string) {
  const back = afterSignInUrl(window.location.origin, redirect);
  return call(() =>
    authClient.signIn.social({ provider: 'google', callbackURL: back, errorCallbackURL: back }),
  );
}

export function signOut() {
  return call(() => authClient.signOut());
}

/**
 * Makes useCurrentUser() ask the server again, e.g. after the name changed
 * or the account was deleted. Otherwise it keeps showing the old one.
 */
export function refreshSignedInUser(): void {
  authClient.$store.notify('$sessionSignal');
}

// ------------- settings (FR-4)

/** TanStack Query's key for GET /account. */
export const ACCOUNT_QUERY_KEY = ['account'];

export function fetchSettings(): Promise<AccountSettings> {
  return get<AccountSettings>('/account');
}

/** Saves some settings. Returns all of them, as they are now. */
export function changeSettings(changes: AccountChanges): Promise<AccountSettings> {
  return patch<AccountSettings>('/account', changes);
}

/** Deletes the account and all its personal data. */
export function deleteAccount(): Promise<void> {
  return del('/account');
}

/** The signed-in user's settings. Pass false for a guest, so nothing is asked. */
export function useAccountSettings(signedIn: boolean) {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: fetchSettings,
    enabled: signedIn,
    staleTime: 5 * 60_000,
  });
}
