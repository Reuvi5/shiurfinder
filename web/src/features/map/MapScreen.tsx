// The map home screen: the side panel on the left, the map on the right.
//
// This component holds the search state: where, how far, what text, which
// filters. It runs ONE search (useMapSearch) and gives the same results to
// both the panel and the map, so they can never disagree.
//
//   MapScreen
//   ├── SidePanel       search box, address, distance, filters, Weekly/Featured lists
//   │   ├── LocationSearch
//   │   ├── FilterPanel
//   │   └── ShiurRow    (one per shiur)
//   └── MapView         the Google map with one pin per shul
//       └── ShulCard    opens when a pin is clicked

import { useEffect, useMemo, useState } from 'react';
import type { ShiurListItem } from '@shiurfinder/shared';
import { messageFor } from '../../api';
import { NO_FILTERS, toQuery, type Filters } from './filters';
import { MapView } from './MapView';
import { SidePanel } from './SidePanel';
import { useMapSearch } from './useMapSearch';
import { DEFAULT_LOCATION, useSearchLocation } from './useSearchLocation';

/** Wait this long after the user stops typing before searching. */
const TYPING_DELAY_MS = 300;

export function MapScreen() {
  const { location, state, useBrowserLocation, setTypedLocation } = useSearchLocation();
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [query, setQuery] = useState(''); // what's in the search box right now
  const [debouncedQuery, setDebouncedQuery] = useState(''); // what we actually search for
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // Ask the browser for the user's location as soon as the page opens.
  useEffect(() => {
    useBrowserLocation();
  }, [useBrowserLocation]);

  // Search once the user pauses typing, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Distance and text only. The Filters panel adds its own choices to this
  // for its live "Show N shiurim" count.
  const baseQuery = useMemo(
    () => ({ radiusMiles, q: debouncedQuery || undefined }),
    [radiusMiles, debouncedQuery],
  );

  const { data, isLoading, isFetching, error } = useMapSearch(location, {
    ...baseQuery,
    ...toQuery(filters),
  });

  const center = location ?? DEFAULT_LOCATION;
  const locationOff = state === 'denied' || state === 'unavailable';

  return (
    <div className="flex h-full flex-col md:flex-row">
      <SidePanel
        locationLabel={
          locationOff
            ? `${DEFAULT_LOCATION.label} (location off)`
            : (location?.label ?? 'finding you…')
        }
        location={location}
        center={center}
        needsLocation={locationOff}
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
        // Clicking a shiur in the list highlights its shul's pin.
        onSelectShiur={(item: ShiurListItem) => setSelectedPinId(item.shul?.id ?? null)}
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
