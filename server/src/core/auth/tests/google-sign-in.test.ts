// "Sign in with Google" (FR-2, Should): on only with its key, and where it
// sends the browser. Google itself isn't called (no real network): what
// happens after Google answers is Better Auth's own, tested by them.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleSignIn } from '../auth.config';
import { memoryAuth } from './memory-auth';

/** Starts "Sign in with Google". Returns where the browser is sent, or the error code. */
async function startGoogleSignIn() {
  const { auth } = memoryAuth();
  try {
    const result = await auth.api.signInSocial({
      body: { provider: 'google', callbackURL: 'http://localhost:5173/sign-in?redirect=%2F' },
    });
    return { url: result.url ? new URL(result.url) : null, code: null };
  } catch (error) {
    return { url: null, code: (error as { body?: { code?: string } }).body?.code };
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('FR-2 Google sign-in', () => {
  it('is off without the key, so it says so and email still works', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');

    expect(googleSignIn()).toEqual({});
    expect((await startGoogleSignIn()).code).toBe('PROVIDER_NOT_FOUND');
  });

  it('is off with only half the key', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');

    expect(googleSignIn()).toEqual({});
  });

  it("sends the browser to Google's sign-in page, coming back to our server", async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');

    const { url } = await startGoogleSignIn();

    expect(url?.host).toBe('accounts.google.com');
    expect(url?.searchParams.get('client_id')).toBe('test-client-id');
    expect(url?.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/auth/callback/google',
    );
    // Only the name and email: Google doesn't need to review it.
    expect(url?.searchParams.get('scope')?.split(' ').sort()).toEqual(
      ['email', 'openid', 'profile'].sort(),
    );
  });
});
