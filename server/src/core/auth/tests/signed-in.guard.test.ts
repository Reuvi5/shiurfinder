// SignedInGuard and @CurrentUser(): guests are refused with NOT_SIGNED_IN
// (FR-1), and a signed-in user reaches the route.

import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { CurrentUser } from '../current-user.decorator';
import { SignedInGuard, type SignedInRequest } from '../signed-in.guard';
import { memoryAuth, signUp } from './memory-auth';

/** What Nest hands a guard or decorator for one request. */
function contextFor(request: SignedInRequest): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}

/** Runs @CurrentUser() the way Nest does for a route's argument. */
function readCurrentUser(request: SignedInRequest): unknown {
  class Route {
    handle(@CurrentUser() _user: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Route, 'handle');
  const { factory } = Object.values(args)[0] as {
    factory: (data: unknown, context: ExecutionContext) => unknown;
  };
  return factory(undefined, contextFor(request));
}

describe('FR-1 routes that need an account', () => {
  it('lets a signed-in user through, and @CurrentUser() is them', async () => {
    const { auth, db, service } = memoryAuth();
    const { userId, cookie } = await signUp(auth, db);
    const request: SignedInRequest = { headers: { cookie } };

    expect(await new SignedInGuard(service).canActivate(contextFor(request))).toBe(true);
    expect(readCurrentUser(request)).toEqual({ id: userId, isModerator: false });
  });

  it('refuses a guest with NOT_SIGNED_IN', async () => {
    const { service } = memoryAuth();
    const guard = new SignedInGuard(service);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toMatchObject({
      status: 401,
      response: { code: 'NOT_SIGNED_IN' },
    });
  });

  it('@CurrentUser() throws on a route that forgot the guard', () => {
    expect(() => readCurrentUser({ headers: {} })).toThrow(/SignedInGuard/);
  });
});
