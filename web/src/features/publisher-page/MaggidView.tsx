// A maggid shiur's page (FR-10): name, bio, Follow, the shuls they teach at,
// and all their shiurim in the next 7 days by date, including ones a shul posted (FR-19).

import { Link } from '@tanstack/react-router';
import type { MaggidShiurPageResult } from '@shiurfinder/shared';
import { ByDay } from './ByDay';
import { PublisherHeader } from './PublisherHeader';

export function MaggidView({ rav }: { rav: MaggidShiurPageResult }) {
  return (
    <>
      <PublisherHeader name={rav.name} />

      {rav.bio && (
        <p className="mt-6 whitespace-pre-line text-slate-700 dark:text-slate-300">{rav.bio}</p>
      )}

      {rav.shuls.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Gives shiurim at</h2>
          <div className="flex flex-wrap gap-2">
            {rav.shuls.map((shul) => (
              <Link
                key={shul.id}
                to="/shul/$id"
                params={{ id: shul.id }}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
              >
                {shul.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Upcoming shiurim</h2>
        <ByDay items={rav.upcoming} hide="maggidShiur" empty="No shiurim in the next 7 days." />
      </section>
    </>
  );
}
