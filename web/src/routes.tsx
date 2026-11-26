// Which page to show for each web address.
//
// Every page is listed here once. To work on a page, edit its own file
// (e.g. features/shiur-page/ShiurPage.tsx), not this one. Adding a new page
// later means adding one route below.

import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AccountPage } from './features/account/AccountPage';
import { parseAccountSearch } from './features/account/account.search';
import { SignInPage } from './features/account/SignInPage';
import { SignUpPage } from './features/account/SignUpPage';
import { DarkModeSync } from './features/account/useDarkMode';
import { MapScreen } from './features/map/MapScreen';
import { parseMapSearch } from './features/map/map.search';
import { PortalPage } from './features/publisher-portal/PortalPage';
import { PublisherPage } from './features/publisher-page/PublisherPage';
import { ShiurPage } from './features/shiur-page/ShiurPage';

/** Every page. DarkModeSync puts the user's light or dark mode on it (FR-4). */
const rootRoute = createRootRoute({
  component: () => (
    <>
      <DarkModeSync />
      <Outlet />
    </>
  ),
});

/** / : the map home screen (FR-5). ?shul=&shiur= say what's open (map.search.ts). */
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MapScreen,
  validateSearch: parseMapSearch,
});

/** /portal : publisher portal, create a shiur (FR-20) */
const portalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal',
  component: PortalPage,
});

/** /shul/123 : a shul page (FR-10) */
const publisherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shul/$id',
  component: PublisherPage,
});

/** /maggid/123 : a maggid shiur page (FR-10). Same page component as /shul. */
const maggidRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maggid/$id',
  component: PublisherPage,
});

/** /shiur/456 : one date of a shiur (FR-9). The id is the occurrence id. */
const shiurRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shiur/$id',
  component: ShiurPage,
});

/** /sign-in?redirect=/shiur/456 : sign in, then go back to that page (FR-2) */
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInPage,
  validateSearch: parseAccountSearch,
});

/** /sign-up?redirect=/shiur/456 : create an account (FR-2) */
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
  validateSearch: parseAccountSearch,
});

/** /account : the signed-in user's settings (FR-4) */
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([
  mapRoute,
  portalRoute,
  publisherRoute,
  maggidRoute,
  shiurRoute,
  signInRoute,
  signUpRoute,
  accountRoute,
]);

export const router = createRouter({ routeTree });

// Lets TypeScript check links, e.g. <Link to="/shul/$id" params={{ id }} />.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
