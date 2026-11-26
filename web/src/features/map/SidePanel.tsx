// The left half of the map screen: search box, address box, distance,
// Filters button, the Weekly / Featured tabs, and the list of shiurim.
//
// It doesn't fetch anything itself. MapScreen runs the search and passes the
// results in, so this panel and the map always show the same search.
// (The one exception is FilterPanel's live count, which runs its own preview search.)

import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { MapSearchQuery, MapSearchResult, ShiurListItem } from '@shiurfinder/shared';
import { AccountButton } from '../account/AccountButton';
import { FilterPanel } from './FilterPanel';
import { NO_FILTERS, countActive, describe, shiurimCount, type Filters } from './filters';
import { LocationSearch } from './LocationSearch';
import { ShiurRow } from '../../components/ShiurRow';
import type { SearchLocation } from './useSearchLocation';

type Tab = 'featured' | 'weekly';

/** The choices in the distance dropdown, in miles. */
const DISTANCES = [2, 5, 10, 25] as const;

interface SidePanelProps {
  /** Shown after "Near:", e.g. "your location" or a typed address. */
  locationLabel: string;
  /** The point searches are measured from; null until we have one. */
  location: { lat: number; lng: number } | null;
  /** Where the map is centred. Address suggestions favour places near here. */
  center: { lat: number; lng: number };
  /** True when location access is off, so we show a "type an address" hint. */
  needsLocation: boolean;
  locating: boolean;
  onPickLocation: (location: SearchLocation) => void;
  onUseMyLocation: () => void;

  radiusMiles: number;
  query: string;
  onQueryChange: (next: string) => void;
  onRadiusChange: (next: number) => void;

  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  /** Distance + text, for the Filters panel's live count. */
  baseQuery: Omit<MapSearchQuery, 'lat' | 'lng'>;

  data: MapSearchResult | undefined;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  onSelectShiur: (item: ShiurListItem) => void;
  /**
   * The shiur whose popup is open (FR-9). Its row is ringed, and the panel
   * switches to its tab and scrolls to it.
   */
  openShiur: ShiurListItem | null;
  /** The shul whose pin was clicked. With no shiur open, all its rows are ringed. */
  selectedShulId: string | null;
}

export function SidePanel({
  locationLabel,
  location,
  center,
  needsLocation,
  locating,
  onPickLocation,
  onUseMyLocation,
  radiusMiles,
  query,
  onQueryChange,
  onRadiusChange,
  filters,
  onFiltersChange,
  baseQuery,
  data,
  isLoading,
  isFetching,
  errorMessage,
  onSelectShiur,
  openShiur,
  selectedShulId,
}: SidePanelProps) {
  const [tab, setTab] = useState<Tab>('weekly');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ------------- following the map
  // The rows the map is pointing at are ringed and scrolled to: the open
  // shiur, or else every shiur at the clicked pin's shul. That can switch
  // tabs; each tab remembers how far down it was scrolled, so switching back
  // by hand returns to where the user was in that list.
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTops = useRef<Record<Tab, number>>({ weekly: 0, featured: 0 });
  /** What to do with the scroll once the new tab has drawn. */
  const afterSwitch = useRef<'restore' | 'show-ringed' | null>(null);

  /** Is this row one the map is pointing at? */
  function isRinged(item: ShiurListItem): boolean {
    if (openShiur) return item.occurrenceId === openShiur.occurrenceId;
    return selectedShulId !== null && item.shul?.id === selectedShulId;
  }

  function changeTab(next: Tab, then: 'restore' | 'show-ringed') {
    if (next === tab) return;
    scrollTops.current[tab] = listRef.current?.scrollTop ?? 0;
    afterSwitch.current = then;
    setTab(next);
  }

  /** Scrolls the first ringed row into view, only as far as needed. */
  function showRingedRow() {
    listRef.current?.querySelector('[data-ringed]')?.scrollIntoView({ block: 'nearest' });
  }

  /** Shows the ringed rows: on this tab if it has any, otherwise on the other one. */
  function goToRinged() {
    if (!data) return;
    const other: Tab = tab === 'weekly' ? 'featured' : 'weekly';
    if (data[tab].some(isRinged)) showRingedRow();
    else if (data[other].some(isRinged)) changeTab(other, 'show-ringed');
    // In neither: a shiur from a pin's card can be missing from this list,
    // because the card ignores the filters. Then we stay where we are.
  }

  // A shiur was opened (here or in a pin's card), or a pin was clicked.
  // Only then, not every time the list refreshes.
  useLayoutEffect(() => {
    if (openShiur || selectedShulId) goToRinged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShiur, selectedShulId]);

  // Runs after a tab switch has drawn the new list (useLayoutEffect, so
  // before the user sees it at the wrong spot).
  useLayoutEffect(() => {
    const then = afterSwitch.current;
    afterSwitch.current = null;
    if (then === 'restore' && listRef.current) listRef.current.scrollTop = scrollTops.current[tab];
    if (then === 'show-ringed') showRingedRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const items = data ? (tab === 'featured' ? data.featured : data.weekly) : [];
  const activeCount = countActive(filters);
  const chips = describe(filters);
  // For the "Try 25 mi" button when nothing is found.
  const nextDistance = DISTANCES.find((d) => d > radiusMiles);

  return (
    <aside className="relative flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-[400px] dark:border-slate-800 dark:bg-slate-950">
      {filtersOpen && (
        // Covers the panel rather than the map, so the user can still see the
        // pins they're narrowing down.
        <div className="absolute inset-0 z-30 bg-white dark:bg-slate-950">
          <FilterPanel
            applied={filters}
            location={location}
            base={baseQuery}
            onClose={() => setFiltersOpen(false)}
            onApply={(next) => {
              onFiltersChange(next);
              setFiltersOpen(false);
            }}
          />
        </div>
      )}

      <header className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">ShiurFinder</h1>
          <div className="flex items-center gap-2">
            {/* The publisher portal (FR-20). */}
            <Link
              to="/portal"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              + Post a shiur
            </Link>
            <AccountButton />
          </div>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search shiurim, shuls, maggidei shiur"
          aria-label="Search shiurim"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
        />

        <LocationSearch
          near={center}
          onSelect={onPickLocation}
          onUseMyLocation={onUseMyLocation}
          locating={locating}
        />

        <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="truncate" title={locationLabel}>
            Near: {locationLabel}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="sr-only">Distance</span>
              <select
                value={radiusMiles}
                onChange={(event) => onRadiusChange(Number(event.target.value))}
                className="rounded border border-slate-300 bg-transparent px-1 py-0.5 dark:border-slate-700"
              >
                {DISTANCES.map((miles) => (
                  <option key={miles} value={miles}>
                    {miles} mi
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className={`rounded-md border px-2.5 py-0.5 font-medium transition ${
                activeCount > 0
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
            >
              Filters{activeCount > 0 && ` · ${activeCount}`}
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => onFiltersChange({ ...filters, [chip.key]: undefined })}
                aria-label={`Remove ${chip.label} filter`}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onFiltersChange(NO_FILTERS)}
              className="text-xs font-medium text-sky-700 underline dark:text-sky-400"
            >
              Clear all
            </button>
          </div>
        )}

        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          <TabButton active={tab === 'weekly'} onClick={() => changeTab('weekly', 'restore')}>
            Weekly {data ? `(${data.weekly.length})` : ''}
          </TabButton>
          <TabButton active={tab === 'featured'} onClick={() => changeTab('featured', 'restore')}>
            Featured {data ? `(${data.featured.length})` : ''}
          </TabButton>
        </nav>

        {/* How many shiurim matched. aria-live makes screen readers announce changes. */}
        {data && (
          <p aria-live="polite" className="text-xs text-slate-500">
            {shiurimCount(data.totalCount)} within {data.radiusMiles} mi
            {isFetching && ' · updating…'}
          </p>
        )}
      </header>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {needsLocation && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Location is off, so this is showing a default area. Type an address or zip code above,
            or allow location access, to see shiurim near you.
          </div>
        )}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        {/* Grey placeholder rows while the first search loads. */}
        {isLoading && !data && <SkeletonRows />}

        {data && items.length === 0 && !isLoading && (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activeCount > 0
                ? `No shiurim match these filters within ${radiusMiles} mi`
                : `No shiurim within ${radiusMiles} mi`}
            </p>
            <div className="mt-2 flex justify-center gap-4">
              {nextDistance && (
                <button
                  type="button"
                  onClick={() => onRadiusChange(nextDistance)}
                  className="text-sm font-medium text-sky-700 underline dark:text-sky-400"
                >
                  Try {nextDistance} mi
                </button>
              )}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => onFiltersChange(NO_FILTERS)}
                  className="text-sm font-medium text-sky-700 underline dark:text-sky-400"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {items.map((item) => (
          // The wrapper rings the row and marks it for showRingedRow, so
          // ShiurRow itself doesn't change.
          <div
            key={item.occurrenceId}
            data-ringed={isRinged(item) || undefined}
            className={`rounded-lg ${isRinged(item) ? 'ring-2 ring-sky-600' : ''}`}
          >
            <ShiurRow item={item} onSelect={() => onSelectShiur(item)} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

/** Five grey boxes shaped like shiur rows, shown while loading. */
function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[78px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      ))}
    </>
  );
}
