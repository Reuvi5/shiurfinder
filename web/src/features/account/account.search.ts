// What the sign-in and sign-up addresses remember: where to go after signing
// in (?redirect=/shiur/123), and why an email link failed (?error=TOKEN_EXPIRED).
//
// Other features send a guest here with a link (FR-1), and they come back
// to the same page once signed in:
//
//   const here = useRouterState({ select: (state) => state.location.href });
//   <Link to="/sign-in" search={{ redirect: here }}>Sign in</Link>

/** The account pages' search params. routes.tsx checks them with parseAccountSearch. */
export interface AccountSearch {
  /** The page to go to after signing in, e.g. "/shiur/123". Check it with safeRedirect. */
  redirect?: string;
  /** Set by the server when a verification link fails, e.g. "TOKEN_EXPIRED". */
  error?: string;
}

/** Where to go when there's no redirect, or it isn't safe. */
export const HOME = '/';

/** Keeps only the params we know, so a bad link (?redirect[]=x) is ignored instead of crashing. */
export function parseAccountSearch(search: Record<string, unknown>): AccountSearch {
  return {
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  };
}

/** Stands in for our own address, to check where a redirect really leads. */
const OUR_SITE = 'https://shiurfinder.invalid';

/**
 * The page to go to after signing in: a page on our own site, or the map.
 * Anything else ("https://evil.example", "//evil.example") would let a link
 * send someone who just signed in to a fake copy of the site.
 */
export function safeRedirect(redirect: string | undefined): string {
  if (!redirect?.startsWith('/')) return HOME;
  // The browser's own parsing decides: "/\evil.example" leads off our site too.
  const url = new URL(redirect, OUR_SITE);
  if (url.origin !== OUR_SITE) return HOME;
  // Going back to sign-in after signing in would go round in a circle.
  if (url.pathname === '/sign-in' || url.pathname === '/sign-up') return HOME;
  return url.pathname + url.search + url.hash;
}

/**
 * Where the verification link leads: our sign-in page, which goes on to
 * `redirect`. Opening the link signs them in first (auth.config.ts on the
 * server), so the sign-in page just passes them through.
 */
export function verifiedUrl(siteOrigin: string, redirect: string | undefined): string {
  return `${siteOrigin}/sign-in?redirect=${encodeURIComponent(safeRedirect(redirect))}`;
}
