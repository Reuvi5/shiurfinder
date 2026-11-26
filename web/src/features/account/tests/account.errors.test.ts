// What a user reads when signing in or up fails (FR-2): Better Auth's errors
// end up as the same messages as every other call.

import { describe, expect, it } from 'vitest';
import { messageFor } from '../../../core/api';
import { linkError, toApiError } from '../account.errors';

describe('FR-2 sign-in errors', () => {
  it('keeps the code, so the user reads our wording for it', () => {
    const error = toApiError({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 });

    expect(error.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(messageFor(error)).toBe('Wrong email or password.');
  });

  it('says to verify first', () => {
    expect(messageFor(toApiError({ code: 'EMAIL_NOT_VERIFIED', status: 403 }))).toBe(
      'Verify your email first. We just sent you a new link.',
    );
  });

  it('says to wait when there were too many tries (a 429 has no code)', () => {
    expect(toApiError({ status: 429 }).code).toBe('TOO_MANY_REQUESTS');
  });

  it('falls back to "Something went wrong" with no code', () => {
    const error = toApiError({ status: 500 });

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(messageFor(error)).toBe('Something went wrong. Try again.');
  });

  it('falls back to "Something went wrong" for a code we have no words for', () => {
    expect(messageFor(toApiError({ code: 'SOMETHING_NEW', status: 400 }))).toBe(
      'Something went wrong. Try again.',
    );
  });
});

describe('FR-2 a verification link that failed', () => {
  it('says an expired link expired', () => {
    expect(messageFor(linkError('TOKEN_EXPIRED'))).toBe(
      'That link has expired. Sign in to get a new one.',
    );
  });

  it("says any other failed link didn't work", () => {
    for (const code of ['INVALID_TOKEN', 'USER_NOT_FOUND', 'INVALID_USER', 'made-up']) {
      expect(messageFor(linkError(code))).toBe("That link didn't work. Sign in to get a new one.");
    }
  });
});
