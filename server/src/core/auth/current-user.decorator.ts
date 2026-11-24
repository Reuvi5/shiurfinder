// @CurrentUser(): the signed-in user, as a route's argument. Only works on a
// route that has @UseGuards(SignedInGuard) (see signed-in.guard.ts).

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SignedInUser } from './auth.service';
import type { SignedInRequest } from './signed-in.guard';

/** Throws on a route without SignedInGuard, so a forgotten guard fails loudly instead of letting guests in. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInUser => {
    const user = context.switchToHttp().getRequest<SignedInRequest>().user;
    if (!user) throw new Error('@CurrentUser() needs @UseGuards(SignedInGuard) on the route');
    return user;
  },
);
