import { useState } from 'react';
import type { MapSearchResult, ShiurListItem } from '@shiurfinder/shared';
import { ShiurRow } from './ShiurRow';

type Tab = 'featured' | 'weekly';

interface SidePanelProps {
  locationLabel: string;
  radiusMiles: number;
  query: string;
  onQueryChange: (next: string) => void;
  onRadiusChange: (next: number) => void;
  data: MapSearchResult | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectShiur: (item: ShiurListItem) => void;
}

/**
 * The left panel of the map home screen (FR-5): search box, location line,
 * then the Featured and Weekly tabs.
 *
 * Takes its data as props rather than fetching its own — the map and this
 * panel must always be showing the same search, and the only way to guarantee
 * that is for one query to feed both.
 */
export function SidePanel({
  locationLabel,
  radiusMiles,
  query,
  onQueryChange,
  onRadiusChange,
  data,
  isLoading,
  errorMessage,
  onSelectShiur,
}: SidePanelProps) {
  const [tab, setTab] = useState<Tab>('weekly');
  const items = data ? (tab === 'featured' ? data.featured : data.weekly) : [];

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-[400px] dark:border-slate-800 dark:bg-slate-950">
      <header className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <h1 className="text-lg font-semibold">ShiurFinder</h1>

        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search shiurim, shuls, maggidei shiur"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
        />

        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Near: {locationLabel}</span>
          <label className="flex items-center gap-1">
            <span className="sr-only">Distance</span>
            <select
              value={radiusMiles}
              onChange={(event) => onRadiusChange(Number(event.target.value))}
              className="rounded border border-slate-300 bg-transparent px-1 py-0.5 dark:border-slate-700"
            >
              {[2, 5, 10, 25].map((miles) => (
                <option key={miles} value={miles}>
                  {miles} mi
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          <TabButton active={tab === 'weekly'} onClick={() => setTab('weekly')}>
            Weekly {data ? `(${data.weekly.length})` : ''}
          </TabButton>
          <TabButton active={tab === 'featured'} onClick={() => setTab('featured')}>
            Featured {data ? `(${data.featured.length})` : ''}
          </TabButton>
        </nav>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        {/* UI Design: "while loading, the panel shows gray placeholder rows." */}
        {isLoading && !data && <SkeletonRows />}

        {data && items.length === 0 && !isLoading && (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No shiurim within {radiusMiles} mi
            </p>
            {radiusMiles < 25 && (
              <button
                type="button"
                onClick={() => onRadiusChange(radiusMiles === 2 ? 5 : radiusMiles === 5 ? 10 : 25)}
                className="mt-2 text-sm font-medium text-sky-700 underline dark:text-sky-400"
              >
                Try a larger distance
              </button>
            )}
          </div>
        )}

        {items.map((item) => (
          <ShiurRow key={item.occurrenceId} item={item} onSelect={() => onSelectShiur(item)} />
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

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[78px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900"
        />
      ))}
    </>
  );
}
