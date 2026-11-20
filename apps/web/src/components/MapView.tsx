import { useQuery } from '@tanstack/react-query';
import { Map, AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps';
import type { MapPin } from '@shiurfinder/shared';
import { fetchShulToday, messageFor } from '../api/client';
import { HAS_MAPS_KEY } from '../lib/maps';
import { ShiurRow } from './ShiurRow';

interface MapViewProps {
  center: { lat: number; lng: number };
  pins: MapPin[];
  selectedPinId: string | null;
  onSelectPin: (publisherId: string | null) => void;
}

/**
 * The map half of the home screen. One pin per shul with upcoming shiurim
 * (FR-5); clicking one opens the card from UC-1 steps 10-11.
 */
export function MapView({ center, pins, selectedPinId, onSelectPin }: MapViewProps) {
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

  // The APIProvider lives in App, so the address box can use Places too.
  return (
    <>
      <Map
        className="h-full w-full"
        defaultCenter={center}
        center={center}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
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

        {selectedPinId && (
          <ShulCard
            pin={pins.find((p) => p.publisherId === selectedPinId)!}
            origin={center}
            onClose={() => onSelectPin(null)}
          />
        )}
      </Map>
    </>
  );
}

/**
 * UC-1 steps 10-11: "the website asks the server for that shul's shiurim today"
 * and shows them with Directions and Follow.
 *
 * Fetches on open rather than up front, so the map doesn't load today's
 * schedule for every shul in the radius when the user may click none of them.
 */
function ShulCard({
  pin,
  origin,
  onClose,
}: {
  pin: MapPin;
  origin: { lat: number; lng: number };
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shul-today', pin.publisherId, origin.lat, origin.lng],
    queryFn: () => fetchShulToday(pin.publisherId, origin),
  });

  return (
    <InfoWindow position={{ lat: pin.lat, lng: pin.lng }} onCloseClick={onClose} maxWidth={340}>
      <div className="min-w-[260px] space-y-2 p-1">
        <div>
          <h2 className="font-semibold text-slate-900">{pin.name}</h2>
          <p className="text-xs text-slate-500">
            {pin.distanceMiles.toFixed(1)} mi · {pin.upcomingCount} upcoming
          </p>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{messageFor(error)}</p>}

        {data && data.shiurim.length === 0 && (
          <p className="text-sm text-slate-500">Nothing else today.</p>
        )}

        <div className="space-y-1.5">
          {data?.shiurim.map((item) => (
            <ShiurRow key={item.occurrenceId} item={item} />
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white"
          >
            Directions
          </a>
          {/* Follow needs sign-in (FR-1), so it lands with the accounts module. */}
          <button
            type="button"
            disabled
            title="Sign in to follow — coming with the accounts module"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-400"
          >
            Follow
          </button>
        </div>
      </div>
    </InfoWindow>
  );
}
