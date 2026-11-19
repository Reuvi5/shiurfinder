import { useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { ShiurListItem } from '@shiurfinder/shared';
import { MapView } from './components/MapView';
import { SidePanel } from './components/SidePanel';
import { useMapSearch } from './hooks/useMapSearch';
import { DEFAULT_LOCATION, useSearchLocation } from './hooks/useSearchLocation';
import { messageFor } from './api/client';
import { NO_FILTERS, toQuery, type Filters } from './lib/filters';
import { BROWSER_KEY, HAS_MAPS_KEY } from './lib/maps';

/**
 * The map home screen — Tracer Bullet FR-5, UC-1.
 *
 * Owns the search state (location, radius, text, filters) and hands it down.
 * The panel and the map are both fed from one useMapSearch call, so they can't
 * disagree about what the current search is.
 */
export default function App() {
  // One Maps loader for the whole page: the map and the address box share it.
  return HAS_MAPS_KEY ? (
    <APIProvider apiKey={BROWSER_KEY}>
      <HomeScreen />
    </APIProvider>
  ) : (
    <HomeScreen />
  );
}

function HomeScreen() {
  const { location, state, useBrowserLocation, setTypedLocation } = useSearchLocation();
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
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

  // Distance and text: everything except the Filters panel's choices. The
  // panel's live count adds its draft to this.
  const baseQuery = useMemo(
    () => ({ radiusMiles, q: debouncedQuery || undefined }),
    [radiusMiles, debouncedQuery],
  );

  const { data, isLoading, isFetching, error } = useMapSearch(location, {
    ...baseQuery,
    ...toQuery(filters),
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
        location={location}
        near={center}
        needsLocation={state === 'denied' || state === 'unavailable'}
        locating={state === 'asking'}
        onPickLocation={(next) => {
          setTypedLocation(next);
          setSelectedPinId(null);
        }}
        onUseMyLocation={useBrowserLocation}
        radiusMiles={radiusMiles}
        query={query}
        onQueryChange={setQuery}
        onRadiusChange={setRadiusMiles}
        filters={filters}
        onFiltersChange={setFilters}
        baseQuery={baseQuery}
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
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
