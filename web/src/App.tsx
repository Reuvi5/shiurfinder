// The whole website. The router (routes.tsx) picks which page to show from
// the web address. To add a page, add it there, not here.

import { APIProvider } from '@vis.gl/react-google-maps';
import { RouterProvider } from '@tanstack/react-router';
import { HAS_MAPS_KEY, MAPS_KEY } from './core/config';
import { router } from './routes';

export default function App() {
  // APIProvider loads Google Maps once for the whole site, so every page can
  // use it. It must stay outside the router. Without a key we skip it; the
  // site still works, just without the map.
  return HAS_MAPS_KEY ? (
    <APIProvider apiKey={MAPS_KEY}>
      <RouterProvider router={router} />
    </APIProvider>
  ) : (
    <RouterProvider router={router} />
  );
}
