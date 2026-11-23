// The user's location, but only if they already allowed this site to use it.
// For the full shiur page (/shiur/:id), to show distance without a pop-up.
//
// Someone opening a Share link didn't ask to be located, so this never shows
// the browser's "allow location?" prompt. If permission was never given, it
// stays null and the page just doesn't show distance. The map screen's own
// location (features/map/useSearchLocation.ts) is the one that asks.
//
// Kept only in memory while the page is open, never saved (NFR-5).

import { useEffect, useState } from 'react';

export function useAllowedLocation(): { lat: number; lng: number } | null {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function locate() {
      // Some browsers have no Permissions API, or throw for 'geolocation'.
      // Then we can't check without prompting, so we don't ask at all.
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state !== 'granted') return;
      } catch {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        },
        // Failing here just means no distance, so there's nothing to show.
        () => {},
        { timeout: 8000, maximumAge: 60_000 },
      );
    }

    void locate();
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
