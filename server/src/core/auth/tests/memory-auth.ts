// A real Better Auth for unit tests, storing users in memory instead of the
// database, and a way to sign someone up and get their login cookie.
//
// Emails aren't sent: `emails.sent` lists them, so a test can follow a link.

import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuth } from '../auth.config';
import type { AccountEmails } from '../auth.email';
import { AuthService } from '../auth.service';

/** One email login sent. `url` is only on verification emails. */
export interface SentEmail {
  kind: 'verify' | 'already-signed-up';
  to: string;
  url?: string;
}

/** Keeps every email in a list instead of sending it. */
class RecordedEmails implements AccountEmails {
  readonly sent: SentEmail[] = [];

  async verifyEmail(to: string, url: string): Promise<void> {
    this.sent.push({ kind: 'verify', to, url });
  }

  async alreadySignedUp(to: string): Promise<void> {
    this.sent.push({ kind: 'already-signed-up', to });
  }
}

/** An AuthService on its own empty in-memory store. `db.user` holds the user rows. */
export function memoryAuth() {
  const db: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const emails = new RecordedEmails();
  const auth = createAuth(memoryAdapter(db), emails);
  return { auth, db, emails, service: new AuthService(auth) };
}

type MemoryAuth = ReturnType<typeof memoryAuth>['auth'];

/** "better-auth.session_token=abc; Path=/; HttpOnly" -> "better-auth.session_token=abc" */
export function cookieFrom(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ');
}

let count = 0;

/** An email no other test in this run has used. */
export function newEmail(): string {
  count += 1;
  return `user${count}@example.com`;
}

/**
 * Signs up a new user, verified, and signs them in. Returns their id and the
 * Cookie header a browser would send. Verifying is skipped: the row is marked
 * verified directly (auth.config.test.ts tests the real link).
 */
export async function signUp(
  auth: MemoryAuth,
  db: ReturnType<typeof memoryAuth>['db'],
  extra: Record<string, unknown> = {},
) {
  const email = newEmail();
  const { user } = await auth.api.signUpEmail({
    body: { name: 'Test User', email, password: 'long-password', ...extra },
  });
  db.user.find((row) => row.id === user.id)!.emailVerified = true;

  const { headers } = await auth.api.signInEmail({
    body: { email, password: 'long-password' },
    returnHeaders: true,
  });
  return { userId: user.id, cookie: cookieFrom(headers) };
}
