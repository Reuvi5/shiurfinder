import { useEffect, useState } from 'react';
import type { ShiurListItem } from '@shiurfinder/shared';
import { MapView } from './components/MapView';
import { SidePanel } from './components/SidePanel';
import { useMapSearch } from './hooks/useMapSearch';
import { DEFAULT_LOCATION, useSearchLocation } from './hooks/useSearchLocation';
import { messageFor } from './api/client';

/**
 * The map home screen — Tracer Bullet FR-5, UC-1.
 *
 * Owns the search state (location, radius, text) and hands it down. The panel
 * and the map are both fed from one useMapSearch call, so they can't disagree
 * about what the current search is.
 */
export default function App() {
  const { location, state, useBrowserLocation } = useSearchLocation();
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // UC-1 step 3: ask for location as soon as the page opens.
  useEffect(() => {
    useBrowserLocation();
  }, [useBrowserLocation]);

  // Don't fire a search on every keystroke — NFR-2 gives filter updates 3
  // seconds, and this keeps us well inside that without hammering the server.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, error } = useMapSearch(location, {
    radiusMiles,
    q: debouncedQuery || undefined,
  });

  const center = location ?? DEFAULT_LOCATION;

  const handleSelectShiur = (item: ShiurListItem) => {
    // Clicking a row in the panel highlights the matching pin.
    setSelectedPinId(item.shul?.id ?? null);
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      <SidePanel
        locationLabel={
          state === 'denied' || state === 'unavailable'
            ? `${DEFAULT_LOCATION.label} (location off)`
            : (location?.label ?? 'finding you…')
        }
        radiusMiles={radiusMiles}
        query={query}
        onQueryChange={setQuery}
        onRadiusChange={setRadiusMiles}
        data={data}
        isLoading={isLoading}
        errorMessage={error ? messageFor(error) : null}
        onSelectShiur={handleSelectShiur}
      />

      <main className="h-[55vh] flex-1 md:h-full">
        <MapView
          center={center}
          pins={data?.pins ?? []}
          selectedPinId={selectedPinId}
          onSelectPin={setSelectedPinId}
        />
      </main>
    </div>
  );
}
