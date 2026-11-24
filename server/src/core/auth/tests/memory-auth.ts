// A real Better Auth for unit tests, storing users in memory instead of the
// database, and a way to sign someone up and get their login cookie.

import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuth } from '../auth.config';
import { AuthService } from '../auth.service';

/** An AuthService on its own empty in-memory store. `db.user` holds the user rows. */
export function memoryAuth() {
  const db: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const auth = createAuth(memoryAdapter(db));
  return { auth, db, service: new AuthService(auth) };
}

let count = 0;

/** Signs up a new user and returns their id and the Cookie header a browser would send. */
export async function signUp(
  auth: ReturnType<typeof memoryAuth>['auth'],
  extra: Record<string, unknown> = {},
) {
  count += 1;
  const { headers, response } = await auth.api.signUpEmail({
    body: {
      name: 'Test User',
      email: `user${count}@example.com`,
      password: 'long-password',
      ...extra,
    },
    returnHeaders: true,
  });
  // "better-auth.session_token=abc; Path=/; HttpOnly" -> "better-auth.session_token=abc"
  const cookie = headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ');
  return { userId: response.user.id, cookie };
}
