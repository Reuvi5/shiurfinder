// One date of a shiur on its own web address, /shiur/:id (FR-9).
//
// This is where Share links go, so it works for someone who never opened the
// map. On the map, the same details open in ShiurCard instead. On top of
// those details, this page adds a small map of the building, and shows
// distance only if the user already allowed location (useAllowedLocation.ts).
// The browser tab shows the shiur's title.

import { useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ShiurInfoLoader } from './ShiurInfoLoader';
import { ShiurMiniMap } from './ShiurMiniMap';
import { useAllowedLocation } from './useAllowedLocation';
import { useShiurDetails } from './useShiurDetails';

export function ShiurPage() {
  const { id } = useParams({ from: '/shiur/$id' });
  const origin = useAllowedLocation();
  // Same request ShiurInfoLoader makes, so it's fetched once and shared.
  const { data } = useShiurDetails(id, origin);

  useTabTitle(data?.title);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <Link to="/" className="text-sm font-medium text-sky-700 underline dark:text-sky-400">
        ← Back to the map
      </Link>
      {data && data.lat !== null && data.lng !== null && (
        <ShiurMiniMap lat={data.lat} lng={data.lng} name={data.shul?.name ?? data.title} />
      )}
      <ShiurInfoLoader occurrenceId={id} origin={origin} />
    </main>
  );
}

/**
 * Puts the shiur's title in the browser tab, e.g. "Daf Yomi · ShiurFinder".
 * Puts the old title back on leaving, or every page would keep this one.
 */
function useTabTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const before = document.title;
    document.title = `${title} · ShiurFinder`;
    return () => {
      document.title = before;
    };
  }, [title]);
}
