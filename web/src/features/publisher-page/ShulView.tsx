// A shul's page (FR-10): name and address, Directions and Follow, then its
// featured and weekly shiurim for the next 7 days, by date. Each row shows its room.

import type { ShulPageResult } from '@shiurfinder/shared';
import { ByDay } from './ByDay';
import { PublisherHeader } from './PublisherHeader';

export function ShulView({ shul }: { shul: ShulPageResult }) {
  return (
    <>
      <PublisherHeader name={shul.name} subtitle={shul.address}>
        {shul.address && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shul.address)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Directions
          </a>
        )}
      </PublisherHeader>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Featured</h2>
        <ByDay items={shul.featured} hide="shul" empty="No featured shiurim in the next 7 days." />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Weekly</h2>
        <ByDay items={shul.weekly} hide="shul" empty="No weekly shiurim in the next 7 days." />
      </section>
    </>
  );
}
