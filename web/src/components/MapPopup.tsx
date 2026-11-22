// A popup on the map that opens below a pin, or above it. Used by ShulCard
// (map) and ShiurCard (shiur-page). Google's own InfoWindow can only open
// above its point, which is why this exists.
//
// It doesn't move the map. MapView's FocusMap picks the side and makes room
// for it, using POPUP_ROOM_PX below.

import { useEffect, useState } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';

/** Which side of the pin the popup opens on. */
export type PopupSide = 'below' | 'above';

/** The popup's body scrolls past this height (or 40% of the screen, if smaller). */
const BODY_MAX_HEIGHT = 'min(380px, 40vh)';

/** Room the map should leave on the popup's side of a point: body + header + arrow + pin. */
export const POPUP_ROOM_PX = 500;

/** Presses and scrolls that must not reach the map (see the effect below). */
const MAP_EVENTS = ['wheel', 'pointerdown', 'mousedown', 'touchstart', 'dblclick', 'contextmenu'];

export function MapPopup({
  position,
  side = 'below',
  onClose,
  header,
  children,
}: {
  /** The pin's point, which is the tip at the bottom of the pin. */
  position: { lat: number; lng: number };
  side?: PopupSide;
  onClose: () => void;
  /** Shown left of the close button, e.g. an "Open full page" link. */
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  // A state ref, not useRef: the map adds the popup's element a moment after
  // the first render, and the effect below has to run again once it exists.
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  // Without this, scrolling the popup zooms the map and dragging in it moves
  // the map. Plain DOM listeners, because the map's own listeners run before
  // React's would. Clicks still get through, so buttons and links work.
  useEffect(() => {
    if (!element) return;
    const stop = (event: Event) => event.stopPropagation();
    MAP_EVENTS.forEach((name) => element.addEventListener(name, stop));
    return () => MAP_EVENTS.forEach((name) => element.removeEventListener(name, stop));
  }, [element]);

  // Escape closes it, like Google's InfoWindow did.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const below = side === 'below';

  return (
    // anchorTop 0%: the popup's top edge sits on the point; -100%: its bottom
    // edge does. Above, pb-12 lifts it clear of the pin, which stands about
    // 40px tall above its point. `clickable` lets the popup receive clicks at
    // all; zIndex keeps it above the other pins.
    <AdvancedMarker position={position} anchorTop={below ? '0%' : '-100%'} clickable zIndex={1000}>
      <div ref={setElement} className={`cursor-auto ${below ? 'pt-3' : 'pb-12'}`}>
        <div className="relative w-[360px] max-w-[85vw] rounded-lg bg-white text-slate-900 shadow-xl ring-1 ring-black/10 dark:bg-slate-950 dark:text-slate-100">
          {/* The little arrow pointing at the pin. */}
          <div
            className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white dark:bg-slate-950 ${
              below ? '-top-1.5' : '-bottom-1.5'
            }`}
          />

          <div className="relative flex items-center justify-between gap-2 px-3 pt-2">
            <div>{header}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: BODY_MAX_HEIGHT }}>
            {children}
          </div>
        </div>
      </div>
    </AdvancedMarker>
  );
}
