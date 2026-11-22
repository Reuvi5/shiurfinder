// The shiur popup (FR-9): opens on the map, pointing at the building the
// shiur is in, when a shiur is clicked in the side panel or in a shul's card.
//
// It takes the place of the shul card rather than opening next to it, so
// there is only ever one popup on the map (MapView decides which one shows).
// The same details have their own page at /shiur/:id (ShiurPage.tsx).

import { Link } from '@tanstack/react-router';
import { InfoWindow } from '@vis.gl/react-google-maps';
import type { ShiurListItem } from '@shiurfinder/shared';
import { ShiurInfoLoader } from './ShiurInfoLoader';

export function ShiurCard({
  item,
  origin,
  onClose,
}: {
  /** The list row that was clicked. Its lat/lng is the building, where the popup points. */
  item: ShiurListItem;
  origin: { lat: number; lng: number };
  onClose: () => void;
}) {
  return (
    <InfoWindow
      position={{ lat: item.lat, lng: item.lng }}
      onCloseClick={onClose}
      maxWidth={380}
      headerContent={
        <Link
          to="/shiur/$id"
          params={{ id: item.occurrenceId }}
          className="text-xs font-medium text-sky-700 underline"
        >
          Open full page
        </Link>
      }
    >
      <div className="min-w-[280px] p-1">
        <ShiurInfoLoader occurrenceId={item.occurrenceId} origin={origin} />
      </div>
    </InfoWindow>
  );
}
