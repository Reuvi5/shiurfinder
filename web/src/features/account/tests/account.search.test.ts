// The sign-in address (FR-1, FR-2): where it goes after signing in, and that
// a link can't send someone off our site.

import { describe, expect, it } from 'vitest';
import { HOME, parseAccountSearch, safeRedirect, verifiedUrl } from '../account.search';

describe('FR-2 the sign-in link', () => {
  it('keeps the redirect and the error', () => {
    expect(parseAccountSearch({ redirect: '/shiur/1', error: 'TOKEN_EXPIRED' })).toEqual({
      redirect: '/shiur/1',
      error: 'TOKEN_EXPIRED',
    });
  });

  it('drops anything that is not plain text, instead of crashing', () => {
    expect(parseAccountSearch({ redirect: ['/x'], error: 42 })).toEqual({
      redirect: undefined,
      error: undefined,
    });
  });

  it('has neither when the link has none', () => {
    expect(parseAccountSearch({})).toEqual({ redirect: undefined, error: undefined });
  });
});

describe('FR-1 going back after signing in', () => {
  it('goes back to the page that sent them, with its search and #', () => {
    expect(safeRedirect('/shiur/123')).toBe('/shiur/123');
    expect(safeRedirect('/?shul=abc&shiur=xyz')).toBe('/?shul=abc&shiur=xyz');
    expect(safeRedirect('/shul/7#weekly')).toBe('/shul/7#weekly');
  });

  it('goes to the map with no redirect', () => {
    expect(safeRedirect(undefined)).toBe(HOME);
    expect(safeRedirect('')).toBe(HOME);
  });

  it('never leaves our site', () => {
    expect(safeRedirect('https://evil.example/sign-in')).toBe(HOME);
    expect(safeRedirect('//evil.example')).toBe(HOME);
    expect(safeRedirect('/\\evil.example')).toBe(HOME);
    expect(safeRedirect('/\t/evil.example')).toBe(HOME);
    expect(safeRedirect('javascript:alert(1)')).toBe(HOME);
    expect(safeRedirect('shiur/1')).toBe(HOME);
  });

  it("doesn't go back to sign-in or sign-up, which would go round in a circle", () => {
    expect(safeRedirect('/sign-in')).toBe(HOME);
    expect(safeRedirect('/sign-in?redirect=%2Fsign-in')).toBe(HOME);
    expect(safeRedirect('/sign-up')).toBe(HOME);
  });

  it('still allows pages whose names only start the same way', () => {
    expect(safeRedirect('/sign-ins')).toBe('/sign-ins');
  });
});

describe('FR-2 the verification link', () => {
  it('leads to sign-in on our site, which goes on to the page', () => {
    expect(verifiedUrl('http://localhost:5173', '/shiur/1?x=1')).toBe(
      'http://localhost:5173/sign-in?redirect=%2Fshiur%2F1%3Fx%3D1',
    );
  });

  it('goes on to the map when the redirect is missing or unsafe', () => {
    expect(verifiedUrl('http://localhost:5173', undefined)).toBe(
      'http://localhost:5173/sign-in?redirect=%2F',
    );
    expect(verifiedUrl('http://localhost:5173', '//evil.example')).toBe(
      'http://localhost:5173/sign-in?redirect=%2F',
    );
  });
});
