// Login's emails (FR-2): what each one says, that a failed send doesn't
// break sign-up, and that SES is only used with all four settings. Nothing
// is really sent: `send` is a list here.

import { Logger } from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  accountEmails,
  alreadySignedUpMessage,
  ConsoleEmails,
  type OutgoingEmail,
  resetMessage,
  SentEmails,
  verifyMessage,
} from '../auth.email';

const LINK = 'http://localhost:3000/auth/verify-email?token=abc&callbackURL=x';

/** All four SES settings, with made-up values. */
const SES = {
  SES_FROM_EMAIL: 'ShiurFinder <no-reply@example.com>',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-key-id',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
};

beforeAll(() => {
  // The failed-send test logs an error on purpose; keep the output clean.
  Logger.overrideLogger(false);
});

describe('FR-2 what the emails say', () => {
  it('the verification email has the link, in the text and as a button', () => {
    const message = verifyMessage('dovid@example.com', LINK);

    expect(message.to).toBe('dovid@example.com');
    expect(message.subject).toBe('Verify your email for ShiurFinder');
    expect(message.text).toContain(LINK);
    expect(message.html).toContain(
      'href="http://localhost:3000/auth/verify-email?token=abc&amp;callbackURL=x"',
    );
  });

  it('the reset email has the link and says it works once, for an hour', () => {
    const message = resetMessage(
      'dovid@example.com',
      'http://localhost:3000/auth/reset-password/t',
    );

    expect(message.subject).toBe('Choose a new ShiurFinder password');
    expect(message.text).toContain('http://localhost:3000/auth/reset-password/t');
    expect(message.text).toContain('works once, for 1 hour');
  });

  it('"already signed up" has no link to an account, just to sign in', () => {
    const message = alreadySignedUpMessage('dovid@example.com', 'http://localhost:5173');

    expect(message.text).toContain('http://localhost:5173/sign-in');
    expect(message.text).not.toContain('token');
  });

  it("a link can't break out of its HTML tag", () => {
    const message = verifyMessage(
      'x@example.com',
      'http://evil.example/"><script>alert(1)</script>',
    );

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('FR-2 sending', () => {
  it('sends each email to the right person', async () => {
    const sent: OutgoingEmail[] = [];
    const emails = new SentEmails(async (message) => {
      sent.push(message);
    });

    await emails.verifyEmail('a@example.com', LINK);
    await emails.alreadySignedUp('b@example.com');
    await emails.resetPassword('c@example.com', 'http://localhost:3000/auth/reset-password/t');

    expect(sent.map((message) => [message.to, message.subject])).toEqual([
      ['a@example.com', 'Verify your email for ShiurFinder'],
      ['b@example.com', 'You already have a ShiurFinder account'],
      ['c@example.com', 'Choose a new ShiurFinder password'],
    ]);
  });

  it("doesn't fail sign-up when SES is down", async () => {
    const emails = new SentEmails(async () => {
      throw new Error('SES is down');
    });

    await expect(emails.verifyEmail('a@example.com', LINK)).resolves.toBeUndefined();
  });
});

describe('FR-2 SES or the console', () => {
  it('sends through SES with all four settings', () => {
    expect(accountEmails(SES)).toBeInstanceOf(SentEmails);
  });

  it('prints to the console with none of them', () => {
    expect(accountEmails({})).toBeInstanceOf(ConsoleEmails);
  });

  it('prints to the console when any one is missing or empty', () => {
    for (const name of Object.keys(SES)) {
      expect(accountEmails({ ...SES, [name]: '' })).toBeInstanceOf(ConsoleEmails);
      expect(accountEmails({ ...SES, [name]: undefined })).toBeInstanceOf(ConsoleEmails);
    }
  });
});
