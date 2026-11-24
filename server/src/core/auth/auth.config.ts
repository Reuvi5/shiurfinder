// Better Auth's settings: how people sign in and what we keep about them (FR-2).
//
// Better Auth answers every request under AUTH_PATH itself (sign-up, sign-in,
// sign-out, get-session, ...): app.setup.ts hands those to it before NestJS
// sees them. Its endpoints: https://www.better-auth.com/docs/concepts/api
//
// Not here yet: verification and password reset emails (SES), and Google sign-in.

import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { webOrigins } from '../config/web-origins';

/** Where Better Auth's endpoints live, e.g. POST /auth/sign-up/email. */
export const AUTH_PATH = '/auth';

/** A Better Auth instance. `database` is Prisma on the server, an in-memory store in unit tests. */
export function createAuth(database: BetterAuthOptions['database']) {
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
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        // input: false, so sign-up can't set it: nobody makes themselves a moderator (NFR-4).
        isModerator: { type: 'boolean', defaultValue: false, input: false },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
