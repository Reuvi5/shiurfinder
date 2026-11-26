// What a user reads when signing in or up fails (FR-2): Better Auth's errors
// end up as the same messages as every other call.

import { describe, expect, it } from 'vitest';
import { ApiRequestError, messageFor } from '../../../core/api';
import { redirectError, resetError, toApiError } from '../account.errors';

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
    expect(messageFor(redirectError('TOKEN_EXPIRED'))).toBe(
      'That link has expired. Sign in to get a new one.',
    );
  });

  it("says any other failed link didn't work", () => {
    for (const code of ['INVALID_TOKEN', 'USER_NOT_FOUND', 'INVALID_USER', 'SOMETHING_NEW']) {
      expect(messageFor(redirectError(code))).toBe(
        "That link didn't work. Sign in to get a new one.",
      );
    }
  });
});

describe('FR-2 Google sign-in that failed', () => {
  it("says Google isn't available when the server has no key, and to use email", () => {
    expect(messageFor(toApiError({ code: 'PROVIDER_NOT_FOUND', status: 404 }))).toBe(
      "Google sign-in isn't available right now. Use your email and password.",
    );
  });

  it("explains an unverified account with the same email can't be linked yet", () => {
    expect(messageFor(redirectError('account_not_linked'))).toContain('isn’t verified yet');
  });

  it('says it was cancelled when they pressed Cancel on Google', () => {
    expect(messageFor(redirectError('access_denied'))).toBe('Google sign-in was cancelled.');
  });

  it('gives a general message for anything else Google sends back', () => {
    for (const code of ['invalid_code', 'unable_to_get_user_info', 'something_new', '']) {
      expect(messageFor(redirectError(code))).toBe(
        "Google sign-in didn't work. Try again, or use your email and password.",
      );
    }
  });
});

describe('FR-2 a reset that failed', () => {
  it('says to ask for a new link when the reset link is no good', () => {
    expect(messageFor(resetError(new ApiRequestError('INVALID_TOKEN', '')))).toBe(
      'That link has expired or was already used. Ask for a new one.',
    );
  });

  it('keeps any other error as it was', () => {
    const tooShort = new ApiRequestError('PASSWORD_TOO_SHORT', '');

    expect(resetError(tooShort)).toBe(tooShort);
    expect(messageFor(resetError(new Error('boom')))).toBe('Something went wrong. Try again.');
  });
});
