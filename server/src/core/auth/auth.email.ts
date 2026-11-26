// The emails login sends (FR-2): the link that verifies an email, "you
// already have an account" when someone signs up with a taken email, and the
// link to choose a new password.
//
// Sent through Amazon SES (design doc, "Build or buy") once its four settings
// are in .env (accountEmails below). Until then they're printed in the server
// console: copy the link from there. auth.config.ts decides when each one is
// sent; this file writes and sends it.

import { Logger } from '@nestjs/common';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { webOrigins } from '../config/web-origins';

/** Sends login's emails: through SES, to the console, or (in unit tests) into a list. */
export interface AccountEmails {
  /** The link that proves `to` is theirs. Signing in waits until it's clicked. */
  verifyEmail(to: string, url: string): Promise<void>;
  /** Someone tried to sign up with `to`, which already has an account. */
  alreadySignedUp(to: string): Promise<void>;
  /** The link to choose a new password ("Forgot password?"). */
  resetPassword(to: string, url: string): Promise<void>;
}

/** One finished email, ready to send. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  /** For mail apps that don't show HTML. Says the same as `html`. */
  text: string;
  html: string;
}

// ------------------------------------------------------------ the words

/** Makes text safe inside HTML, so a link can't break out of its tag. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** An email of a few lines and one button. */
function email(
  to: string,
  subject: string,
  lines: string[],
  button?: { label: string; url: string },
) {
  const text = [...lines, ...(button ? [`${button.label}: ${button.url}`] : [])].join('\n\n');
  const paragraphs = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  const link = button
    ? `<p><a href="${escapeHtml(button.url)}">${escapeHtml(button.label)}</a></p>`
    : '';
  return { to, subject, text, html: `${paragraphs}${link}` };
}

/** "Verify your email": the link from sign-up, or from signing in before verifying. */
export function verifyMessage(to: string, url: string): OutgoingEmail {
  return email(
    to,
    'Verify your email for ShiurFinder',
    [
      'Open the link below to finish signing up for ShiurFinder. It works for 1 hour.',
      "If you didn't sign up, you can ignore this email.",
    ],
    { label: 'Verify my email', url },
  );
}

/** Someone signed up with an email that already has an account. */
export function alreadySignedUpMessage(to: string, siteUrl: string): OutgoingEmail {
  return email(
    to,
    'You already have a ShiurFinder account',
    [
      'Someone tried to sign up for ShiurFinder with this email, but it already has an account.',
      'If it was you, sign in instead. Forgot your password? Use "Forgot password?" on the sign-in page. If it wasn\'t you, you can ignore this email.',
    ],
    { label: 'Sign in', url: `${siteUrl}/sign-in` },
  );
}

/** "Choose a new password": the link from "Forgot password?". */
export function resetMessage(to: string, url: string): OutgoingEmail {
  return email(
    to,
    'Choose a new ShiurFinder password',
    [
      'Open the link below to choose a new password. It works once, for 1 hour.',
      "If you didn't ask for this, you can ignore this email: your password stays the same.",
    ],
    { label: 'Choose a new password', url },
  );
}

// ------------------------------------------------------------ sending

/**
 * Writes each email and hands it to `send` (SES on the server). If sending
 * fails, it's logged and the request carries on, so sign-up still works with
 * SES down (design doc: the app keeps working when a service fails). The user
 * can press "Send it again".
 */
export class SentEmails implements AccountEmails {
  private readonly logger = new Logger('AccountEmails');

  constructor(private readonly send: (email: OutgoingEmail) => Promise<void>) {}

  verifyEmail(to: string, url: string): Promise<void> {
    return this.deliver(verifyMessage(to, url));
  }

  alreadySignedUp(to: string): Promise<void> {
    return this.deliver(alreadySignedUpMessage(to, webOrigins()[0]));
  }

  resetPassword(to: string, url: string): Promise<void> {
    return this.deliver(resetMessage(to, url));
  }

  private async deliver(message: OutgoingEmail): Promise<void> {
    try {
      await this.send(message);
    } catch (error) {
      // Never the link itself: logs aren't private.
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Couldn't send "${message.subject}" to ${message.to}: ${reason}`);
    }
  }
}

/** Sends through Amazon SES. The AWS keys are read from .env by Amazon's own package. */
export function sesSender(from: string, region: string) {
  const client = new SESv2Client({ region });
  return async (message: OutgoingEmail): Promise<void> => {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: message.text, Charset: 'UTF-8' },
              Html: { Data: message.html, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
  };
}

/** Prints each email in the server console instead of sending it. */
export class ConsoleEmails implements AccountEmails {
  private readonly logger = new Logger('AccountEmails');

  async verifyEmail(to: string, url: string): Promise<void> {
    this.logger.log(`Verify ${to} (until SES is set up, open this link): ${url}`);
  }

  async alreadySignedUp(to: string): Promise<void> {
    this.logger.log(
      `Someone tried to sign up as ${to}, which already has an account. ` +
        `They'd be told to sign in at ${webOrigins()[0]}/sign-in`,
    );
  }

  async resetPassword(to: string, url: string): Promise<void> {
    this.logger.log(`New password for ${to} (until SES is set up, open this link): ${url}`);
  }
}

/** The four SES settings in .env. All four, or emails stay in the console. */
const SES_SETTINGS = [
  'SES_FROM_EMAIL',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
] as const;

/**
 * Real emails through SES when all four settings are in .env, otherwise the
 * console. Half set up counts as not set up, so a missing key prints the link
 * instead of failing to send it.
 */
export function accountEmails(env: NodeJS.ProcessEnv = process.env): AccountEmails {
  if (SES_SETTINGS.every((name) => env[name])) {
    return new SentEmails(sesSender(env.SES_FROM_EMAIL!, env.AWS_REGION!));
  }
  return new ConsoleEmails();
}
