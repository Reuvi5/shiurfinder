// Who is signed in, from a request's cookie. Features don't call this
// directly: they put SignedInGuard on a route and read @CurrentUser().
//
// Also holds the handler for Better Auth's own endpoints (see app.setup.ts).

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { Auth } from './auth.config';

/** The Better Auth instance. auth.module.ts makes it with Prisma; unit tests with memory. */
export const AUTH = Symbol('AUTH');

/** What a route learns about the person signed in. */
export interface SignedInUser {
  id: string;
  isModerator: boolean;
}

@Injectable()
export class AuthService {
  /** Answers sign-up, sign-in, sign-out and the rest of Better Auth's endpoints. */
  readonly handler: (request: IncomingMessage, response: ServerResponse) => Promise<void>;

  constructor(@Inject(AUTH) private readonly auth: Auth) {
    this.handler = toNodeHandler(auth);
  }

  /** The signed-in user, or null for a guest, an expired session or a made-up cookie. */
  async signedInUser(headers: IncomingHttpHeaders): Promise<SignedInUser | null> {
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
    if (!session) return null;
    return { id: session.user.id, isModerator: session.user.isModerator === true };
  }
}
