// The right half of the map screen: the Google map, one pin per shul that has
// upcoming shiurim. Clicking a pin opens ShulCard.

import { AdvancedMarker, Map, Pin } from '@vis.gl/react-google-maps';
import type { MapPin } from '@shiurfinder/shared';
import { HAS_MAPS_KEY } from '../../core/config';
import { ShulCard } from './ShulCard';

interface MapViewProps {
  center: { lat: number; lng: number };
  pins: MapPin[];
  selectedPinId: string | null;
  onSelectPin: (publisherId: string | null) => void;
}

export function MapView({ center, pins, selectedPinId, onSelectPin }: MapViewProps) {
  // Can be undefined if a new search no longer includes the selected shul.
  const selectedPin = pins.find((pin) => pin.publisherId === selectedPinId);

  // No key: show how to add one instead of a broken grey map.
  if (!HAS_MAPS_KEY) {
    return (
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
  return (
    <Map
      className="h-full w-full"
      defaultCenter={center}
      center={center}
      defaultZoom={13}
      gestureHandling="greedy"
      mapId="shiurfinder-map"
      onClick={() => onSelectPin(null)}
    >
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

      {selectedPin && (
        <ShulCard
          pin={selectedPin}
          origin={center}
          onClose={() => onSelectPin(null)}
        />
      )}
    </Map>
  );
}
