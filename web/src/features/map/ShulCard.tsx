// The popup that opens when a shul's pin is clicked: that shul's remaining
// shiurim today, plus Directions and Follow buttons.
//
// It only fetches when it opens, so the map doesn't load today's schedule
// for every shul in range when the user might not click any of them.

import { useQuery } from '@tanstack/react-query';
import { InfoWindow } from '@vis.gl/react-google-maps';
import type { MapPin } from '@shiurfinder/shared';
import { fetchShulToday, messageFor } from '../../api';
import { ShiurRow } from './ShiurRow';

export function ShulCard({
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
          {/* Following needs an account, so this stays disabled until accounts are built. */}
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
