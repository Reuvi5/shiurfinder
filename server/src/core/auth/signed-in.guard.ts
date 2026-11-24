// Lets a route run only for someone signed in (FR-1: save, follow and report
// need an account). Example:
//
//   @Post(':id/save')
//   @UseGuards(SignedInGuard)
//   save(@CurrentUser() user: SignedInUser) { ... }
//
// It only checks that someone is signed in. Whether they may change *this*
// shul's shiurim is the feature's own check, in its service (NFR-4).

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthService, type SignedInUser } from './auth.service';

/** A request after SignedInGuard: `user` is who is signed in. */
export interface SignedInRequest {
  headers: IncomingHttpHeaders;
  user?: SignedInUser;
}

@Injectable()
export class SignedInGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  /** Refuses a guest with 401 NOT_SIGNED_IN; the website shows "Sign in to do that." */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const user = await this.authService.signedInUser(request.headers);
    if (!user) {
      throw new UnauthorizedException({ code: 'NOT_SIGNED_IN', message: 'Sign in to do that.' });
    }
    request.user = user;
    return true;
  }
}
