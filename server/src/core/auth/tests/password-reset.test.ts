// "Forgot password?" on a real Better Auth with an in-memory store (FR-2):
// the link it emails, choosing a new password, and what's refused. On the
// real database: auth.db.test.ts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cookieFrom, memoryAuth, newEmail, signUp } from './memory-auth';

type Setup = ReturnType<typeof memoryAuth>;

/** Where the reset link leads back to: our reset page. */
const RESET_PAGE = 'http://localhost:5173/reset-password';

/** Asks for a reset link. Returns what the server answered. */
function askForLink({ auth }: Setup, email: string) {
  return auth.api.requestPasswordReset({ body: { email, redirectTo: RESET_PAGE } });
}

/** The last reset link sent to `to`. */
function lastLink({ emails }: Setup, to: string): string {
  const sent = emails.sent.filter((email) => email.kind === 'reset-password' && email.to === to);
  const url = sent.at(-1)?.url;
  if (!url) throw new Error(`No reset link was sent to ${to}`);
  return url;
}

/** Opens the reset link the way a browser would. Returns where it sends the browser. */
async function openLink({ auth }: Setup, url: string): Promise<URL> {
  const response = await auth.handler(new Request(url));
  return new URL(response.headers.get('location')!);
}

/** Chooses a new password with the token from the reset page. Returns the error code, or null. */
async function choosePassword({ auth }: Setup, token: string, newPassword: string) {
  try {
    await auth.api.resetPassword({ body: { token, newPassword } });
    return null;
  } catch (error) {
    return (error as { body?: { code?: string } }).body?.code ?? 'ERROR';
  }
}

/** Signs in. Returns the error code, or 'OK'. */
async function signIn({ auth }: Setup, email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return 'OK';
  } catch (error) {
    return (error as { body?: { code?: string } }).body?.code;
  }
}

/** A verified user with password "long-password". Returns their email and login cookie. */
async function userWithPassword(setup: Setup) {
  const { userId, cookie } = await signUp(setup.auth, setup.db);
  const email = setup.db.user.find((row) => row.id === userId)!.email as string;
  return { email, cookie };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FR-2 forgot password', () => {
  it('emails a link that leads to our reset page with a token', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);

    await askForLink(setup, email);
    const page = await openLink(setup, lastLink(setup, email));

    expect(page.origin + page.pathname).toBe(RESET_PAGE);
    expect(page.searchParams.get('token')).toBeTruthy();
  });

  it('answers the same for an email with no account, and sends nothing', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);

    const known = await askForLink(setup, email);
    const unknown = await askForLink(setup, newEmail());

    expect(unknown).toEqual(known);
    expect(setup.emails.sent.filter((sent) => sent.kind === 'reset-password')).toHaveLength(1);
  });

  it('changes the password: the new one works and the old one no longer does', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);
    await askForLink(setup, email);
    const page = await openLink(setup, lastLink(setup, email));

    const error = await choosePassword(setup, page.searchParams.get('token')!, 'new-password-1');

    expect(error).toBeNull();
    expect(await signIn(setup, email, 'new-password-1')).toBe('OK');
    expect(await signIn(setup, email, 'long-password')).toBe('INVALID_EMAIL_OR_PASSWORD');
  });

  it('signs them out everywhere else', async () => {
    const setup = memoryAuth();
    const { email, cookie } = await userWithPassword(setup);
    await askForLink(setup, email);
    const page = await openLink(setup, lastLink(setup, email));

    await choosePassword(setup, page.searchParams.get('token')!, 'new-password-1');

    expect(await setup.service.signedInUser({ cookie })).toBeNull();
  });

  it('works only once', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);
    await askForLink(setup, email);
    const token = (await openLink(setup, lastLink(setup, email))).searchParams.get('token')!;

    await choosePassword(setup, token, 'new-password-1');
    const second = await choosePassword(setup, token, 'new-password-2');

    expect(second).toBe('INVALID_TOKEN');
    expect(await signIn(setup, email, 'new-password-1')).toBe('OK');
  });

  it('refuses a made-up token', async () => {
    const setup = memoryAuth();

    expect(await choosePassword(setup, 'made-up-token', 'new-password-1')).toBe('INVALID_TOKEN');
  });

  it('refuses a new password shorter than 8 characters, and keeps the old one', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);
    await askForLink(setup, email);
    const token = (await openLink(setup, lastLink(setup, email))).searchParams.get('token')!;

    expect(await choosePassword(setup, token, 'short')).toBe('PASSWORD_TOO_SHORT');
    expect(await signIn(setup, email, 'long-password')).toBe('OK');
  });

  it('a link still works after 59 minutes, but not after 61', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));
    const setup = memoryAuth();
    const first = await userWithPassword(setup);
    const second = await userWithPassword(setup);
    await askForLink(setup, first.email);
    await askForLink(setup, second.email);

    vi.setSystemTime(new Date('2026-11-26T12:59:00Z'));
    const fresh = await openLink(setup, lastLink(setup, first.email));
    vi.setSystemTime(new Date('2026-11-26T13:01:00Z'));
    const stale = await openLink(setup, lastLink(setup, second.email));

    expect(fresh.searchParams.get('token')).toBeTruthy();
    expect(stale.searchParams.get('error')).toBe('INVALID_TOKEN');
  });

  it('verifies the email too, so they can sign in right after', async () => {
    const setup = memoryAuth();
    const email = newEmail();
    await setup.auth.api.signUpEmail({
      body: { name: 'Test User', email, password: 'long-password' },
    });
    await askForLink(setup, email);
    const token = (await openLink(setup, lastLink(setup, email))).searchParams.get('token')!;

    await choosePassword(setup, token, 'new-password-1');

    expect(await signIn(setup, email, 'new-password-1')).toBe('OK');
  });

  it('lets an account made with Google set a password', async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);
    // Like a Google-only account: no password login.
    setup.db.account.length = 0;
    await askForLink(setup, email);
    const token = (await openLink(setup, lastLink(setup, email))).searchParams.get('token')!;

    await choosePassword(setup, token, 'new-password-1');

    expect(await signIn(setup, email, 'new-password-1')).toBe('OK');
  });
});

describe('FR-2 the login cookie after a reset', () => {
  it("doesn't sign them in by itself: they sign in with the new password", async () => {
    const setup = memoryAuth();
    const { email } = await userWithPassword(setup);
    await askForLink(setup, email);
    const token = (await openLink(setup, lastLink(setup, email))).searchParams.get('token')!;

    const { headers } = await setup.auth.api.resetPassword({
      body: { token, newPassword: 'new-password-1' },
      returnHeaders: true,
    });

    expect(cookieFrom(headers)).not.toContain('session_token');
  });
});
