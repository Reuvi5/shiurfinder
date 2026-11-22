// One date of a shiur on its own web address, /shiur/:id (FR-9).
//
// This is where Share links go, so it works for someone who never opened the
// map. On the map, the same details open in ShiurCard instead. There's no
// search point here, so no distance is shown.

import { Link, useParams } from '@tanstack/react-router';
import { ShiurInfoLoader } from './ShiurInfoLoader';

export function ShiurPage() {
  const { id } = useParams({ from: '/shiur/$id' });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <Link to="/" className="text-sm font-medium text-sky-700 underline dark:text-sky-400">
        ← Back to the map
      </Link>
      <ShiurInfoLoader occurrenceId={id} />
    </main>
  );
}
