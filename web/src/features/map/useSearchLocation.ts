// Where the search is centred: the browser's location, or an address the
// user typed. If location access is denied, falls back to Teaneck.
//
// The point is only kept in memory while the page is open. It's sent to the
// server as part of a search and never saved anywhere (NFR-5).

import { useCallback, useRef, useState } from 'react';

export interface SearchLocation {
  lat: number;
  lng: number;
  /** What to show after "Near:" in the side panel. */
  label: string;
}

/** Where the map centres when we have nothing else — central Teaneck. */
export const DEFAULT_LOCATION: SearchLocation = {
  lat: 40.8976,
  lng: -74.0204,
  label: 'Teaneck, NJ',
};

/**
 * idle: haven't asked yet.  asking: waiting for the browser.
 * granted: using the browser's location.  typed: using an address the user picked.
 * denied / unavailable: no browser location, so we're on the default area.
 */
type LocationState = 'idle' | 'asking' | 'granted' | 'typed' | 'denied' | 'unavailable';

export function useSearchLocation() {
  const [location, setLocation] = useState<SearchLocation | null>(null);
  const [state, setState] = useState<LocationState>('idle');
  // Remembers if the user ever typed an address, so a late "denied" from the
  // browser doesn't throw their typed address away.
  const hasTypedRef = useRef(false);

  /** Ask the browser for the user's location. */

  const useBrowserLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable');
      setLocation((current) => current ?? DEFAULT_LOCATION);
      return;
    }

    setState('asking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'your location',
        });
        setState('granted');
      },
      () => {
        // Denied or timed out: use the default area (or keep a typed address).
        setState(hasTypedRef.current ? 'typed' : 'denied');
        setLocation((current) => current ?? DEFAULT_LOCATION);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  /** Called by the address box when the user picks an address. */
  const setTypedLocation = useCallback((next: SearchLocation) => {
    hasTypedRef.current = true;
    setLocation(next);
    setState('typed');
  }, []);

  return { location, state, useBrowserLocation, setTypedLocation };
}
