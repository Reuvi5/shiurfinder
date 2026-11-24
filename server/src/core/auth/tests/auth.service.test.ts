// AuthService on a real Better Auth with an in-memory store: who a cookie
// belongs to, and that nobody can make themselves a moderator. The Prisma
// tables are tested in auth.db.test.ts.

import { describe, expect, it } from 'vitest';
import { memoryAuth, signUp } from './memory-auth';

describe('FR-2 who is signed in', () => {
  it("finds the user from their login cookie, and they aren't a moderator", async () => {
    const { auth, service } = memoryAuth();
    const { userId, cookie } = await signUp(auth);

    expect(await service.signedInUser({ cookie })).toEqual({ id: userId, isModerator: false });
  });

  it('returns null for a guest with no cookie', async () => {
    const { service } = memoryAuth();

    expect(await service.signedInUser({})).toBeNull();
  });

  it('returns null for a made-up cookie', async () => {
    const { service } = memoryAuth();

    expect(
      await service.signedInUser({ cookie: 'better-auth.session_token=made-up.signature' }),
    ).toBeNull();
  });

  it('returns null after the user signs out', async () => {
    const { auth, service } = memoryAuth();
    const { cookie } = await signUp(auth);

    await auth.api.signOut({ headers: new Headers({ cookie }) });

    expect(await service.signedInUser({ cookie })).toBeNull();
  });

  it("doesn't mix up two users", async () => {
    const { auth, service } = memoryAuth();
    const first = await signUp(auth);
    const second = await signUp(auth);

    expect((await service.signedInUser({ cookie: first.cookie }))?.id).toBe(first.userId);
    expect((await service.signedInUser({ cookie: second.cookie }))?.id).toBe(second.userId);
  });
});

describe('NFR-4 moderators', () => {
  it('says a moderator is one', async () => {
    const { auth, db, service } = memoryAuth();
    const { userId, cookie } = await signUp(auth);
    // Only we make moderators, straight in the database.
    db.user.find((row) => row.id === userId)!.isModerator = true;

    expect(await service.signedInUser({ cookie })).toEqual({ id: userId, isModerator: true });
  });

  it("can't be chosen at sign-up", async () => {
    const { auth, db } = memoryAuth();

    // Better Auth either refuses the field or ignores it. Either way, no moderator.
    await signUp(auth, { isModerator: true }).catch(() => undefined);

    expect(db.user.some((row) => row.isModerator === true)).toBe(false);
  });
});
