// The emails login sends (FR-2): the link that verifies an email, "you
// already have an account" when someone signs up with a taken email, and the
// link to choose a new password.
//
// Until Amazon SES is set up (design doc, "Build or buy"), they're printed in
// the server console: copy the link from there. auth.config.ts decides when
// each one is sent; this file only sends it.

import { Logger } from '@nestjs/common';
import { webOrigins } from '../config/web-origins';

/** Sends login's emails. The server prints them; unit tests keep them in a list. */
export interface AccountEmails {
  /** The link that proves `to` is theirs. Signing in waits until it's clicked. */
  verifyEmail(to: string, url: string): Promise<void>;
  /** Someone tried to sign up with `to`, which already has an account. */
  alreadySignedUp(to: string): Promise<void>;
  /** The link to choose a new password ("Forgot password?"). */
  resetPassword(to: string, url: string): Promise<void>;
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
