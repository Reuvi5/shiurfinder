// The right half of the map screen: the Google map, one pin per shul that has
// upcoming shiurim, and a blue dot for the user. Clicking a pin opens ShulCard;
// clicking a shiur (in the side panel or in ShulCard) opens ShiurCard in its
// place. Both popups open next to their pin (components/MapPopup.tsx), and
// FocusMap moves the map so the open one fits on screen.

import { useEffect } from 'react';
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import type { MapPin, ShiurListItem } from '@shiurfinder/shared';
import { POPUP_ROOM_PX, type PopupSide } from '../../components/MapPopup';
import { HAS_MAPS_KEY } from '../../core/config';
import { ShiurCard } from '../shiur-page/ShiurCard';
import { ShiurInfoLoader } from '../shiur-page/ShiurInfoLoader';
import { ShulCard } from './ShulCard';

type Point = { lat: number; lng: number };

/** With no user dot, opening a shiur zooms in to this if the map is further out. */
const SHIUR_ZOOM = 14;

/** Fitting the user and a shul next door would zoom right in; stop at street level. */
const MAX_FIT_ZOOM = 15;

interface MapViewProps {
  center: Point;
  /** Where the user really is (browser or typed address). null when we're on the default area. */
  userLocation: (Point & { label: string }) | null;
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
  userLocation,
  pins,
  selectedPinId,
  onSelectPin,
  openShiur,
  onSelectShiur,
  onCloseShiur,
}: MapViewProps) {
  // Can be undefined if a new search no longer includes the selected shul.
  const selectedPin = pins.find((pin) => pin.publisherId === selectedPinId);

  // The shiur popup opens on the side of the pin away from the user's dot, so
  // it never covers it: above when the user is south (lower on the map),
  // below otherwise. You and the popup end up on opposite sides of the pin.
  const shiurSide: PopupSide =
    openShiur && userLocation && userLocation.lat < openShiur.lat ? 'above' : 'below';

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
  // where the user dragged it). MoveMap and FocusMap move it instead.
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

      {/* A shiur: fit the user and the shul in view, to show how far it is. */}
      {openShiur && (
        <FocusMap
          point={openShiur}
          from={userLocation}
          side={shiurSide}
          zoomTo={SHIUR_ZOOM}
          trigger={openShiur}
        />
      )}
      {/* A shul pin: only move as much as needed to fit its card. */}
      {!openShiur && selectedPin && (
        <FocusMap point={selectedPin} from={null} side="below" trigger={selectedPin.publisherId} />
      )}

      {userLocation && <UserDot location={userLocation} />}

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
        <ShiurCard item={openShiur} origin={center} side={shiurSide} onClose={onCloseShiur} />
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

// ---------------------------------------------------------------- user dot

/** The blue "you are here" dot. Not clickable, so clicks pass through to the map. */
function UserDot({ location }: { location: Point & { label: string } }) {
  return (
    // -50% / -50%: the dot's middle sits on the point (the default is its bottom).
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      anchorLeft="-50%"
      anchorTop="-50%"
      title={location.label}
    >
      <div className="h-4 w-4 rounded-full border-2 border-white bg-sky-600 shadow-md ring-4 ring-sky-600/20" />
    </AdvancedMarker>
  );
}

// ---------------------------------------------------------------- moving the map
// Both must be inside <Map>, which is what useMap() reads.

/** Slides the map to `to` whenever it changes (a new search point). */
function MoveMap({ to }: { to: Point }) {
  const map = useMap();

  useEffect(() => {
    map?.panTo({ lat: to.lat, lng: to.lng });
    // Only when the point itself changes, not on every new object with the same numbers.
  }, [map, to.lat, to.lng]);

  return null;
}

/**
 * Moves the map for an open popup, which opens on `side` of `point`.
 *
 * With `from` (the user): fits both in view, with room on that side for the
 * popup, so the user sees how far the shul is. MapView puts the popup on the
 * side away from the user, so the extra room is past the shul, not over the user. Without it: zooms in to
 * `zoomTo` if the map is further out, then pans just enough to fit the popup.
 *
 * Runs only when `trigger` changes (a new click), not when the user drags
 * the map afterwards or the search refreshes.
 */
function FocusMap({
  point,
  from,
  side,
  zoomTo,
  trigger,
}: {
  point: Point;
  from: Point | null;
  side: PopupSide;
  zoomTo?: number;
  trigger: unknown;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const padding = popupPadding(map, side);
    const target = new google.maps.LatLngBounds({ lat: point.lat, lng: point.lng });

    if (from) {
      target.extend({ lat: from.lat, lng: from.lng });
      // fitBounds has no zoom limit of its own, so set one just for this move.
      map.setOptions({ maxZoom: MAX_FIT_ZOOM });
      map.fitBounds(target, padding);
      google.maps.event.addListenerOnce(map, 'idle', () => map.setOptions({ maxZoom: null }));
      return;
    }

    if (zoomTo !== undefined && (map.getZoom() ?? zoomTo) < zoomTo) {
      map.setZoom(zoomTo);
      // Pan after the zoom lands, or the pan is worked out at the old zoom.
      google.maps.event.addListenerOnce(map, 'idle', () => map.panToBounds(target, padding));
    } else {
      map.panToBounds(target, padding);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trigger]);

  return null;
}

/**
 * Space to keep clear around the view: a lot on the popup's side, and half
 * the popup's width left and right. Capped by the map's size, so a small
 * phone map still has somewhere to put the point.
 */
function popupPadding(map: google.maps.Map, side: PopupSide): google.maps.Padding {
  const { clientWidth: width, clientHeight: height } = map.getDiv();
  const room = Math.min(POPUP_ROOM_PX, height * 0.7);
  const edge = Math.min(190, width * 0.3);
  return side === 'below'
    ? { top: 56, bottom: room, left: edge, right: edge }
    : { top: room, bottom: 32, left: edge, right: edge };
}
