// The whole website. Right now it's one screen, the map.
// When there are more pages (create a shiur, my account), this is where you
// choose which one to show.

import { APIProvider } from '@vis.gl/react-google-maps';
import { HAS_MAPS_KEY, MAPS_KEY } from './config';
import { MapScreen } from './features/map/MapScreen';

export default function App() {
  // APIProvider loads Google Maps once for the whole page, so the map and the
  // address search box share it. Without a key we skip it; the screen still
  // works, just without the map.
  return HAS_MAPS_KEY ? (
    <APIProvider apiKey={MAPS_KEY}>
      <MapScreen />
    </APIProvider>
  ) : (
    <MapScreen />
  );
}
