// The right half of the map screen: the Google map, one pin per shul that has
// upcoming shiurim. Clicking a pin opens ShulCard; clicking a shiur (in the
// side panel or in ShulCard) opens ShiurCard in its place and moves the map to it.

import { useEffect } from 'react';
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import type { MapPin, ShiurListItem } from '@shiurfinder/shared';
import { HAS_MAPS_KEY } from '../../core/config';
import { ShiurCard } from '../shiur-page/ShiurCard';
import { ShiurInfoLoader } from '../shiur-page/ShiurInfoLoader';
import { ShulCard } from './ShulCard';

/** Opening a shiur zooms in to this if the map is further out, so its pin is easy to see. */
const SHIUR_ZOOM = 14;

interface MapViewProps {
  center: { lat: number; lng: number };
  pins: MapPin[];
  selectedPinId: string | null;
  onSelectPin: (publisherId: string | null) => void;
  /** The shiur whose popup is open, if any. It replaces the shul card. */
  openShiur: ShiurListItem | null;
  /** A shiur in the shul card was clicked. */
  onSelectShiur: (item: ShiurListItem) => void;
  onCloseShiur: () => void;
}

export function MapView({
  center,
  pins,
  selectedPinId,
  onSelectPin,
  openShiur,
  onSelectShiur,
  onCloseShiur,
}: MapViewProps) {
  // Can be undefined if a new search no longer includes the selected shul.
  const selectedPin = pins.find((pin) => pin.publisherId === selectedPinId);

  // No key: show how to add one instead of a broken grey map. A clicked shiur
  // still shows here, so the details work without a key.
  if (!HAS_MAPS_KEY) {
    return openShiur ? (
      <div className="h-full overflow-y-auto p-6">
        <button
          type="button"
          onClick={onCloseShiur}
          className="mb-3 text-sm font-medium text-sky-700 underline dark:text-sky-400"
        >
          Close
        </button>
        <ShiurInfoLoader occurrenceId={openShiur.occurrenceId} origin={center} />
      </div>
    ) : (
      <div className="flex h-full items-center justify-center bg-slate-100 p-8 text-center dark:bg-slate-900">
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
          No Google Maps key. Add{' '}
          <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">
            VITE_GOOGLE_MAPS_BROWSER_KEY
          </code>{' '}
          to your <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">.env</code> and
          restart the dev server.
        </p>
      </div>
    );
  }

  // Google Maps itself is loaded once, in App.tsx.
  //
  // Only defaultCenter, not center: with `center` set, the map jumps back to
  // it on every re-render, so it could never move to a clicked shiur (or stay
  // where the user dragged it). The MoveMap components move it instead.
  return (
    <Map
      className="h-full w-full"
      defaultCenter={center}
      defaultZoom={13}
      gestureHandling="greedy"
      mapId="shiurfinder-map"
      onClick={() => onSelectPin(null)}
    >
      <MoveMap to={center} />
      {openShiur && <MoveMap to={openShiur} zoom={SHIUR_ZOOM} />}

      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.publisherId}
          position={{ lat: pin.lat, lng: pin.lng }}
          onClick={() => onSelectPin(pin.publisherId)}
        >
          <Pin
            background={selectedPinId === pin.publisherId ? '#0369a1' : '#1e293b'}
            borderColor="#0f172a"
            glyphColor="#ffffff"
          />
        </AdvancedMarker>
      ))}

      {/* One popup at a time: the shiur's if one is open, otherwise the shul's. */}
      {openShiur ? (
        <ShiurCard item={openShiur} origin={center} onClose={onCloseShiur} />
      ) : (
        selectedPin && (
          <ShulCard
            pin={selectedPin}
            origin={center}
            onClose={() => onSelectPin(null)}
            onSelectShiur={onSelectShiur}
          />
        )
      )}
    </Map>
  );
}

/**
 * Slides the map to `to` whenever it changes: a new search point, or a
 * clicked shiur. With `zoom`, also zooms in that far if the map is further out
 * (never zooms out). Must be inside <Map>, which is what useMap() reads.
 */
function MoveMap({ to, zoom }: { to: { lat: number; lng: number }; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: to.lat, lng: to.lng });
    if (zoom !== undefined && (map.getZoom() ?? zoom) < zoom) {
      map.setZoom(zoom);
    }
    // Only when the point itself changes, not on every new object with the same numbers.
  }, [map, to.lat, to.lng, zoom]);

  return null;
}
