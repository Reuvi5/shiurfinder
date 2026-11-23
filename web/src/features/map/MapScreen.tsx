// The map home screen: the side panel on the left, the map on the right.
//
// This component holds the search state: where, how far, what text, which
// filters. It runs ONE search (useMapSearch) and gives the same results to
// both the panel and the map, so they can never disagree.
//
// Which pin and shiur are open lives in the web address instead
// (map.search.ts), so the browser's Back button goes back through them.
//
//   MapScreen
//   ├── SidePanel       search box, address, distance, filters, Weekly/Featured lists
//   │   ├── LocationSearch
//   │   ├── FilterPanel
//   │   └── ShiurRow    (one per shiur, from components/)
//   └── MapView         the Google map with one pin per shul
//       ├── ShulCard    opens when a pin is clicked
//       └── ShiurCard   opens when a shiur is clicked (features/shiur-page/, FR-9)

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ShiurListItem } from '@shiurfinder/shared';
import { messageFor } from '../../core/api';
import { NO_FILTERS, toQuery, type Filters } from './filters';
import type { MapSearch } from './map.search';
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

  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const selectedPinId = search.shul ?? null;
  // The URL only has the shiur's id, but the popup needs the whole row (it
  // points at the building's lat/lng). So keep every row the user clicked.
  const clickedShiurim = useRef(new Map<string, ShiurListItem>());
  const [clicks, setClicks] = useState(0);

  /** Opens `next` as a new step in the browser's history. Nothing changes if it's already open. */
  function show(next: MapSearch) {
    if (next.shul === search.shul && next.shiur === search.shiur) return;
    navigate({ search: next });
  }

  /** A pin was clicked (or the map, to close). Only one popup at a time, so the shiur's closes. */
  function selectPin(publisherId: string | null) {
    show({ shul: publisherId ?? undefined });
  }

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
  // Only a real location gets the blue dot, never the default area.
  const userLocation = state === 'granted' || state === 'typed' ? location : null;

  /**
   * The row for the shiur in the URL. Found in the clicked rows, or in the
   * lists for a link that was opened fresh. Kept once found, so it's the same
   * object every time: a new one moves the map back to it (FocusMap in
   * MapView), which would happen every time the search refreshes.
   * Not found (a refreshed link to a shiur that was only in a shul card): no popup.
   */
  const openShiur = useMemo(() => {
    if (!search.shiur) return null;
    const id = search.shiur;
    const row =
      clickedShiurim.current.get(id) ??
      data?.featured.find((item) => item.occurrenceId === id) ??
      data?.weekly.find((item) => item.occurrenceId === id);
    if (row) clickedShiurim.current.set(id, row);
    return row ?? null;
    // clicks: a click on the open shiur stores a new copy, which must show.
  }, [search.shiur, data, clicks]);

  /**
   * Opens a shiur's popup, at `shul`'s pin. A copy, so clicking the same
   * shiur again still counts as a new click and the map moves back to it.
   */
  function openShiurPopup(item: ShiurListItem, shul: string | undefined) {
    clickedShiurim.current.set(item.occurrenceId, { ...item });
    setClicks((n) => n + 1);
    show({ shul, shiur: item.occurrenceId });
  }

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
          selectPin(null);
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
        // Clicking a shiur in the list highlights its shul's pin, moves the
        // map there, and opens the shiur popup at it.
        onSelectShiur={(item: ShiurListItem) => openShiurPopup(item, item.shul?.id)}
        openShiur={openShiur}
        selectedShulId={selectedPinId}
      />

      <main className="h-[55vh] flex-1 md:h-full">
        <MapView
          center={center}
          userLocation={userLocation}
          pins={data?.pins ?? []}
          selectedPinId={selectedPinId}
          onSelectPin={selectPin}
          openShiur={openShiur}
          onSelectShiur={(item) => openShiurPopup(item, search.shul)}
          onCloseShiur={() => selectPin(null)}
        />
      </main>
    </div>
  );
}
