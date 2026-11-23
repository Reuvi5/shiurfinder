// A shul's or maggid shiur's public page (FR-10). No sign-in needed (FR-1).
//
// Both /shul/$id and /maggid/$id show this page. It loads the publisher, then
// shows ShulView or MaggidView depending on what the server says it is.
// Refreshes every minute, so changes and cancellations show up without a reload.

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { messageFor } from '../../core/api';
import { MaggidView } from './MaggidView';
import { fetchPublisherPage } from './publisher-page.api';
import { ShulView } from './ShulView';

const REFRESH_MS = 60_000;

export function PublisherPage() {
  // strict: false because two routes share this page; both have an $id.
  const { id } = useParams({ strict: false }) as { id: string };

  const { data, isLoading, error } = useQuery({
    queryKey: ['publisher-page', id],
    queryFn: () => fetchPublisherPage(id),
    refetchInterval: REFRESH_MS,
    retry: 1,
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← Map
      </Link>

      <div className="mt-4">
        {isLoading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{messageFor(error)}</p>}
        {data?.type === 'SHUL' && <ShulView shul={data} />}
        {data?.type === 'MAGGID_SHIUR' && <MaggidView rav={data} />}
      </div>
    </main>
  );
}
