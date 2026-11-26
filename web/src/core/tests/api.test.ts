// patch() and del(): what they return or throw. The server is a small fake
// standing in for `fetch`, so no real network. The tests only check what
// comes back, the way a feature would use them.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, del, patch } from '../api';

/**
 * A fake server with one account. PATCH /account changes its name (only when
 * sent as JSON with the login cookie) and DELETE /account removes it.
 * Anything else answers like our real server does for a wrong request.
 */
function fakeServer() {
  let account: { name: string } | null = { name: 'Dovid' };
  const answer = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    const path = new URL(url).pathname;
    if (init.credentials !== 'include') return answer(401, { code: 'NOT_SIGNED_IN' });
    if (path !== '/account') return answer(404, { code: 'NOT_FOUND' });
    if (!account) return answer(401, { code: 'NOT_SIGNED_IN' });

    if (init.method === 'PATCH') {
      const json = (init.headers as Record<string, string> | undefined)?.['Content-Type'];
      if (json !== 'application/json') return answer(400, { code: 'INVALID_REQUEST' });
      account = { ...account, ...JSON.parse(String(init.body)) };
      return answer(200, account);
    }
    if (init.method === 'DELETE') {
      account = null;
      return answer(204);
    }
    return answer(404, { code: 'NOT_FOUND' });
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(fakeServer()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('patch()', () => {
  it('changes something and returns the reply', async () => {
    expect(await patch('/account', { name: 'Moshe' })).toEqual({ name: 'Moshe' });
  });

  it("throws the server's error code", async () => {
    await expect(patch('/no-such-thing', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws INTERNAL_ERROR when the error has no JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Bad Gateway', { status: 502 })),
    );

    await expect(patch('/account', {})).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it("throws NETWORK when the server can't be reached", async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await patch('/account', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).code).toBe('NETWORK');
  });
});

describe('del()', () => {
  it('removes something, and returns undefined for an empty reply (204)', async () => {
    expect(await del('/account')).toBeUndefined();

    // It's gone: the next change is refused.
    await expect(patch('/account', { name: 'Moshe' })).rejects.toMatchObject({
      code: 'NOT_SIGNED_IN',
    });
  });

  it('returns the JSON when there is a reply', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"deleted":true}', { status: 200 })),
    );

    expect(await del<{ deleted: boolean }>('/saves/1')).toEqual({ deleted: true });
  });

  it("throws the server's error code", async () => {
    await expect(del('/no-such-thing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
