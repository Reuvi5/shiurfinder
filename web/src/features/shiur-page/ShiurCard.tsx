// The shiur popup (FR-9): opens on the map at the building the shiur is in,
// when a shiur is clicked in the side panel or in a shul's card.
//
// It takes the place of the shul card rather than opening next to it, so
// there is only ever one popup on the map (MapView decides which one shows).
// The same details have their own page at /shiur/:id (ShiurPage.tsx).

import { Link } from '@tanstack/react-router';
import type { ShiurListItem } from '@shiurfinder/shared';
import { MapPopup, type PopupSide } from '../../components/MapPopup';
import { ShiurInfoLoader } from './ShiurInfoLoader';

export function ShiurCard({
  item,
  origin,
  side,
  onClose,
}: {
  /** The list row that was clicked. Its lat/lng is the building, where the popup points. */
  item: ShiurListItem;
  origin: { lat: number; lng: number };
  /** Away from the user's dot, so the popup doesn't cover it (MapView decides). */
  side: PopupSide;
  onClose: () => void;
}) {
  return (
    <MapPopup
      position={{ lat: item.lat, lng: item.lng }}
      side={side}
      onClose={onClose}
      header={
        <Link
          to="/shiur/$id"
          params={{ id: item.occurrenceId }}
          className="text-xs font-medium text-sky-700 underline dark:text-sky-400"
        >
          Open full page
        </Link>
      }
    >
      <ShiurInfoLoader occurrenceId={item.occurrenceId} origin={origin} />
    </MapPopup>
  );
}
