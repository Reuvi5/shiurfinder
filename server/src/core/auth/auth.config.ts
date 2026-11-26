// Better Auth's settings: how people sign in and what we keep about them (FR-2).
//
// Better Auth answers every request under AUTH_PATH itself (sign-up, sign-in,
// sign-out, get-session, ...): app.setup.ts hands those to it before NestJS
// sees them. Its endpoints: https://www.better-auth.com/docs/concepts/api
//
// Signing in waits until the email is verified. The emails themselves are in
// auth.email.ts. "Sign in with Google" is on when GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET are set (googleSignIn below).
//
// Not here yet: password reset.

import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { webOrigins } from '../config/web-origins';
import type { AccountEmails } from './auth.email';

/** Where Better Auth's endpoints live, e.g. POST /auth/sign-up/email. */
export const AUTH_PATH = '/auth';

/**
 * Google sign-in (FR-2, Should), or nothing without its key. Then the Google
 * button says it isn't available and email and password still work (design
 * doc, "Errors").
 *
 * Google's own verified emails need no link from us. A Google account is
 * linked to an existing account with the same email (SRS FR-2), but only one
 * whose email is already verified (Better Auth's default): otherwise someone
 * could sign up with another person's Gmail, wait for them to use Google, and
 * share their account.
 */
export function googleSignIn(): BetterAuthOptions['socialProviders'] {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return {};
  return { google: { clientId, clientSecret } };
}

/**
 * A Better Auth instance. `database` is Prisma on the server, an in-memory
 * store in unit tests. `emails` sends the verification links.
 */
export function createAuth(database: BetterAuthOptions['database'], emails: AccountEmails) {
  return betterAuth({
    database,
    basePath: AUTH_PATH,
    baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
    // Signs the session cookie. Better Auth refuses to start in production without it.
    // `|| undefined`: the empty line in .env.example means "not set", not an empty secret.
    secret: process.env.BETTER_AUTH_SECRET || undefined,
    trustedOrigins: webOrigins(),
    // Refuse login requests from other websites, in tests too: Better Auth
    // turns this off when NODE_ENV is "test" unless it's set here, so the tests
    // would check a server that differs from the real one.
    advanced: { disableOriginCheck: false },
    emailAndPassword: {
      enabled: true,
      // FR-2: no signing in until the email is verified. This also means
      // sign-up never says "Email already in use", so nobody can check who
      // has an account. The owner of that email gets told instead.
      requireEmailVerification: true,
      onExistingUserSignUp: ({ user }) => emails.alreadySignedUp(user.email),
    },
    emailVerification: {
      sendOnSignUp: true,
      // Signing in before verifying sends a new link, so an expired one
      // (they last an hour) is never a dead end.
      sendOnSignIn: true,
      // Clicking the link signs them in, then goes to the link's callbackURL.
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => emails.verifyEmail(user.email, url),
    },
    socialProviders: googleSignIn(),
    user: {
      additionalFields: {
        // input: false, so sign-up can't set it: nobody makes themselves a moderator (NFR-4).
        isModerator: { type: 'boolean', defaultValue: false, input: false },
        // input: true, so a guest's dark mode (kept in their browser) carries
        // over into the account they sign up for (FR-4). Changed later at /account.
        darkMode: { type: 'boolean', defaultValue: false, input: true },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
