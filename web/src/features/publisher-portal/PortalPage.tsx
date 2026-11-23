// Publisher portal: post a weekly or featured shiur (FR-20, UC-2).
//
// No sign-in yet, so the form lets you pick any approved shul. Once accounts
// are built, the shul will come from who is signed in.
//
// After saving, every cached map search is thrown away, so going back to the
// map shows the new shiur straight away instead of after the next refresh.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { NewShiur, NewShiurResult } from '@shiurfinder/shared';
import { messageFor } from '../../core/api';
import { createShiur, fetchPortalOptions } from './portal.api';
import { ShiurForm } from './ShiurForm';

export function PortalPage() {
  const queryClient = useQueryClient();
  const [posted, setPosted] = useState<{ title: string; result: NewShiurResult } | null>(null);

  const options = useQuery({
    queryKey: ['portal-options'],
    queryFn: fetchPortalOptions,
    staleTime: 5 * 60_000,
  });

  const save = useMutation({
    mutationFn: createShiur,
    onSuccess: (result, shiur: NewShiur) => {
      setPosted({ title: shiur.title, result });
      // The map, side panel, filter choices and shul pages all read these.
      void queryClient.invalidateQueries();
      window.scrollTo({ top: 0 });
    },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <Link to="/" className="text-sm font-medium text-sky-700 underline dark:text-sky-400">
          ← Back to the map
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Post a shiur</h1>
        <p className="text-sm text-slate-500">
          It shows up on the map as soon as you post it (if it's in the next 7 days).
        </p>
      </div>

      {options.isLoading && <p className="text-slate-500">Loading…</p>}
      {options.error && <p className="text-red-600">{messageFor(options.error)}</p>}

      {posted ? (
        <Posted
          title={posted.title}
          result={posted.result}
          onAnother={() => {
            setPosted(null);
            save.reset();
          }}
        />
      ) : (
        options.data && (
          <ShiurForm
            options={options.data}
            saving={save.isPending}
            error={save.error}
            onSubmit={(shiur) => save.mutate(shiur)}
          />
        )
      )}
    </main>
  );
}

/** Shown after saving: where to see the new shiur. */
function Posted({
  title,
  result,
  onAnother,
}: {
  title: string;
  result: NewShiurResult;
  onAnother: () => void;
}) {
  const dates = result.occurrenceCount === 1 ? '1 date' : `${result.occurrenceCount} dates`;

  return (
    <div className="space-y-4 rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <p>
        <strong>{title}</strong> is posted ({dates}).
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          See it on the map
        </Link>
        <Link
          to="/shiur/$id"
          params={{ id: result.firstOccurrenceId }}
          className="rounded-md border border-emerald-700/30 px-3 py-1.5 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900"
        >
          Open the shiur page
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-md border border-emerald-700/30 px-3 py-1.5 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900"
        >
          Post another
        </button>
      </div>
    </div>
  );
}
