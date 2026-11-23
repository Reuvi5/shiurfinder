// A small map with the shiur's building on it, for the full shiur page
// (/shiur/:id). Someone opening a Share link sees where it is at a glance.
//
// Just the one pin, no popups or searching; that's what the map screen is for.
// Google Maps is loaded once for the whole site, in App.tsx.

import { AdvancedMarker, Map, Pin } from '@vis.gl/react-google-maps';
import { HAS_MAPS_KEY, MAP_ID } from '../../core/config';

/** Close enough to see the streets around the building. */
const ZOOM = 15;

export function ShiurMiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  // No key: no map. The page still has the address and the Directions button.
  if (!HAS_MAPS_KEY) return null;

  return (
    <div className="h-56 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <Map
        className="h-full w-full"
        defaultCenter={{ lat, lng }}
        defaultZoom={ZOOM}
        // "cooperative": scrolling the page doesn't zoom the map by accident;
        // zooming takes Ctrl + scroll, or two fingers on a phone.
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        mapId={MAP_ID}
      >
        <AdvancedMarker position={{ lat, lng }} title={name}>
          <Pin background="#0369a1" borderColor="#0f172a" glyphColor="#ffffff" />
        </AdvancedMarker>
      </Map>
    </div>
  );
}
