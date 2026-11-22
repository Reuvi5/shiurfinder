// Which page to show for each web address.
//
// Every page is listed here once. To work on a page, edit its own file
// (e.g. features/shiur-page/ShiurPage.tsx), not this one. Adding a new page
// later means adding one route below.

import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { MapScreen } from './features/map/MapScreen';
import { PortalPage } from './features/publisher-portal/PortalPage';
import { PublisherPage } from './features/publisher-page/PublisherPage';
import { ShiurPage } from './features/shiur-page/ShiurPage';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

/** / : the map home screen (FR-5) */
const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MapScreen,
});

/** /portal : publisher portal, create a shiur (FR-20) */
const portalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portal',
  component: PortalPage,
});

/** /shul/123 : a shul or maggid shiur page (FR-10) */
const publisherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shul/$id',
  component: PublisherPage,
});

/** /shiur/456 : one date of a shiur (FR-9). The id is the occurrence id. */
const shiurRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shiur/$id',
  component: ShiurPage,
});

const routeTree = rootRoute.addChildren([mapRoute, portalRoute, publisherRoute, shiurRoute]);

export const router = createRouter({ routeTree });

// Lets TypeScript check links, e.g. <Link to="/shul/$id" params={{ id }} />.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
