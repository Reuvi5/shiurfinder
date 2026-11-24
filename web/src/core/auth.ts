// Login for the website: who is signed in, and `authClient` for signing up,
// in and out. It talks to Better Auth on the server (server/src/core/auth/),
// which keeps the login in an HttpOnly cookie page scripts can't read.
//
//   const { user, isChecking } = useCurrentUser();
//   await authClient.signIn.email({ email, password });
//   await authClient.signOut();

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { API_URL } from './config';

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/auth', // AUTH_PATH in server/src/core/auth/auth.config.ts
  // Our extra field on User, so `isModerator` is typed below.
  plugins: [inferAdditionalFields({ user: { isModerator: { type: 'boolean', input: false } } })],
});

/** The person signed in, as the website sees them. */
export interface SignedInUser {
  id: string;
  name: string | null;
  email: string;
  isModerator: boolean;
}

/**
 * Who is signed in. `user` is null for a guest. While the first check is
 * still running, `isChecking` is true and `user` is null, so wait for it
 * before showing "Sign in", or a signed-in user sees it flash on every page.
 */
export function useCurrentUser(): { user: SignedInUser | null; isChecking: boolean } {
  const { data, isPending } = authClient.useSession();
  if (!data) return { user: null, isChecking: isPending };
  return {
    user: {
      id: data.user.id,
      name: data.user.name || null,
      email: data.user.email,
      isModerator: data.user.isModerator === true,
    },
    isChecking: false,
  };
}
