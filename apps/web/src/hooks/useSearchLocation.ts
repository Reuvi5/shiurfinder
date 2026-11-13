import { useCallback, useState } from 'react';

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

type LocationState = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

/**
 * UC-1 step 3: the user allows location access, or types an address.
 *
 * NFR-5: the point is held in component state for as long as the page is open
 * and is never sent anywhere except as query parameters on a search. Nothing
 * writes it to storage, and the server doesn't persist it either.
 */
export function useSearchLocation() {
  const [location, setLocation] = useState<SearchLocation | null>(null);
  const [state, setState] = useState<LocationState>('idle');

  const useBrowserLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable');
      setLocation(DEFAULT_LOCATION);
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
        // Denied or timed out: fall back to the default area and let them type
        // an address instead (UI Design, "With no location" screen state).
        setState('denied');
        setLocation(DEFAULT_LOCATION);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  /** Used by the address box once Google Places returns a chosen place. */
  const setTypedLocation = useCallback((next: SearchLocation) => {
    setLocation(next);
    setState('granted');
  }, []);

  return { location, state, useBrowserLocation, setTypedLocation };
}
