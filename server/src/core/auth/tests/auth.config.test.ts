// Email verification on a real Better Auth with an in-memory store (FR-2):
// sign-up sends a link, signing in waits for it, and a taken email doesn't
// say so. The same settings on the real database: auth.db.test.ts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cookieFrom, memoryAuth, newEmail } from './memory-auth';

type Setup = ReturnType<typeof memoryAuth>;

/** Signs up without verifying. Returns the email and what sign-up answered. */
async function signUpUnverified({ auth }: Setup, email = newEmail()) {
  const response = await auth.api.signUpEmail({
    body: { name: 'Test User', email, password: 'long-password' },
    returnHeaders: true,
  });
  return { email, ...response };
}

/** Signs in. Returns the error code, or the login cookie. */
async function signIn({ auth }: Setup, email: string, password = 'long-password') {
  try {
    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    return { cookie: cookieFrom(headers), code: null };
  } catch (error) {
    return { cookie: null, code: (error as { body?: { code?: string } }).body?.code };
  }
}

/** Opens a verification link the way a browser would. */
function openLink({ auth }: Setup, url: string) {
  return auth.handler(new Request(url));
}

/** The last verification link sent to `to`. */
function lastLink({ emails }: Setup, to: string): string {
  const link = emails.sent.filter((email) => email.kind === 'verify' && email.to === to).at(-1);
  if (!link?.url) throw new Error(`No verification link was sent to ${to}`);
  return link.url;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-2 sign up sends a verification link', () => {
  it('sends a link to the new email, and does not sign them in yet', async () => {
    const setup = memoryAuth();

    const { email, response, headers } = await signUpUnverified(setup);

    expect(response.token).toBeNull();
    expect(cookieFrom(headers)).not.toContain('session_token');
    expect(setup.emails.sent).toEqual([{ kind: 'verify', to: email, url: expect.any(String) }]);
  });

  it('refuses to sign in before the email is verified, and sends a new link', async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);

    const result = await signIn(setup, email);

    expect(result.code).toBe('EMAIL_NOT_VERIFIED');
    expect(setup.emails.sent.filter((sent) => sent.kind === 'verify')).toHaveLength(2);
  });

  it("the new link from signing in goes to the page sign-in was given, not the server's address", async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    await setup.auth.api
      .signInEmail({
        body: {
          email,
          password: 'long-password',
          callbackURL: 'http://localhost:5173/sign-in?redirect=%2F',
        },
      })
      .catch(() => undefined);

    const response = await openLink(setup, lastLink(setup, email));

    expect(response.headers.get('location')).toBe('http://localhost:5173/sign-in?redirect=%2F');
  });

  it('signs them in when they open the link, and goes to the page in the link', async () => {
    const setup = memoryAuth();
    const email = newEmail();
    await setup.auth.api.signUpEmail({
      body: {
        name: 'Test User',
        email,
        password: 'long-password',
        callbackURL: 'http://localhost:5173/sign-in?redirect=%2Fshiur%2F1',
      },
    });

    const response = await openLink(setup, lastLink(setup, email));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:5173/sign-in?redirect=%2Fshiur%2F1',
    );
    const user = await setup.service.signedInUser({ cookie: cookieFrom(response.headers) });
    expect(user).not.toBeNull();
  });

  it('lets them sign in with their password once verified', async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    await openLink(setup, lastLink(setup, email));

    const right = await signIn(setup, email);
    const wrong = await signIn(setup, email, 'wrong-password');

    expect(right.cookie).toContain('session_token');
    expect(wrong.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });

  it('does not verify with a link that was changed', async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    const link = new URL(lastLink(setup, email));
    link.searchParams.set('token', link.searchParams.get('token')!.slice(0, -2) + 'xx');

    await openLink(setup, link.toString());

    expect((await signIn(setup, email)).code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('a link still works after 59 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);

    vi.setSystemTime(new Date('2026-11-24T12:59:00Z'));
    await openLink(setup, lastLink(setup, email));

    expect((await signIn(setup, email)).cookie).toContain('session_token');
  });

  it('a link no longer works after 61 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    const link = lastLink(setup, email);

    vi.setSystemTime(new Date('2026-11-24T13:01:00Z'));
    const response = await openLink(setup, link);

    expect(response.headers.get('location')).toContain('error=TOKEN_EXPIRED');
    expect((await signIn(setup, email)).code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('FR-2 signing up with an email that has an account', () => {
  it("answers like a new sign-up, so nobody learns it's taken", async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);

    const second = await setup.auth.api.signUpEmail({
      body: { name: 'Someone Else', email, password: 'other-password' },
    });

    expect(second.token).toBeNull();
    expect(second.user.email).toBe(email);
    expect(setup.db.user).toHaveLength(1);
  });

  it('tells the owner of the email, instead of sending a link', async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    setup.emails.sent.length = 0;

    await setup.auth.api.signUpEmail({
      body: { name: 'Someone Else', email, password: 'other-password' },
    });

    expect(setup.emails.sent).toEqual([{ kind: 'already-signed-up', to: email }]);
  });

  it("does not change the owner's password", async () => {
    const setup = memoryAuth();
    const { email } = await signUpUnverified(setup);
    await openLink(setup, lastLink(setup, email));

    await setup.auth.api.signUpEmail({
      body: { name: 'Someone Else', email, password: 'other-password' },
    });

    expect((await signIn(setup, email, 'long-password')).cookie).toContain('session_token');
    expect((await signIn(setup, email, 'other-password')).code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });
});
