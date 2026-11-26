// patch() and del(): what they send, and what they return or throw. The
// server is a fake `fetch`, so no real network.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, del, patch } from '../api';

/** Makes `fetch` answer with this status and body, and returns the fake to see what was sent. */
function serverAnswers(status: number, body: string) {
  const fake = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(body || null, { status }),
  );
  vi.stubGlobal('fetch', fake);
  return fake;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('patch()', () => {
  it('sends the body as JSON with the login cookie, and returns the reply', async () => {
    const fake = serverAnswers(200, '{"name":"Dovid"}');

    const reply = await patch<{ name: string }>('/account', { name: 'Dovid' });

    expect(reply).toEqual({ name: 'Dovid' });
    const [url, init] = fake.mock.calls[0];
    expect(url).toMatch(/\/account$/);
    expect(init).toMatchObject({
      method: 'PATCH',
      body: '{"name":"Dovid"}',
      credentials: 'include',
    });
  });

  it("throws the server's error code", async () => {
    serverAnswers(400, '{"code":"INVALID_REQUEST","message":"name: too long"}');

    await expect(patch('/account', {})).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('throws INTERNAL_ERROR when the error has no JSON', async () => {
    serverAnswers(502, 'Bad Gateway');

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
  it('sends a DELETE with no body, and returns undefined for an empty reply (204)', async () => {
    const fake = serverAnswers(204, '');

    const reply = await del('/account');

    expect(reply).toBeUndefined();
    const [, init] = fake.mock.calls[0];
    expect(init).toMatchObject({ method: 'DELETE', credentials: 'include' });
    expect(init?.body).toBeUndefined();
  });

  it('returns the JSON when there is a reply', async () => {
    serverAnswers(200, '{"deleted":true}');

    expect(await del<{ deleted: boolean }>('/saves/1')).toEqual({ deleted: true });
  });

  it("throws the server's error code", async () => {
    serverAnswers(401, '{"code":"NOT_SIGNED_IN","message":"Sign in"}');

    await expect(del('/account')).rejects.toMatchObject({ code: 'NOT_SIGNED_IN' });
  });
});
