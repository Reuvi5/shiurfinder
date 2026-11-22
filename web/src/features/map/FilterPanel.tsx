// The Filters panel: day, time, topic, language and audience (FR-8).
//
// Choices are a draft until the user presses "Show N shiurim", so the map
// doesn't jump on every tap. The count on that button is live, though: it
// runs a preview search so the user sees what their choices will find.
// The preview uses the same cache as the main search, so pressing the button
// shows the results instantly.

import { useState } from 'react';
import type { MapSearchQuery } from '@shiurfinder/shared';
import {
  DAYS,
  NO_FILTERS,
  TIME_PERIODS,
  countActive,
  shiurimCount,
  toQuery,
  type Filters,
  type TimePeriod,
} from './filters';
import { useFilterOptions } from './useFilterOptions';
import { useMapSearch } from './useMapSearch';

interface FilterPanelProps {
  /** The filters currently in use. The draft starts from these. */
  applied: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  /** Distance and search text — counted together with the draft filters. */
  base: Omit<MapSearchQuery, 'lat' | 'lng'>;
}

export function FilterPanel({ applied, onApply, onClose, location, base }: FilterPanelProps) {
  const [draft, setDraft] = useState<Filters>(applied);
  const options = useFilterOptions();
  const preview = useMapSearch(location, { ...base, ...toQuery(draft) }, { live: false });

  // Tapping a chip picks it; tapping the picked chip again un-picks it.
  function toggle<K extends keyof Filters>(key: K, value: Filters[K]) {
    setDraft((current) => ({ ...current, [key]: current[key] === value ? undefined : value }));
  }

  const count = preview.data?.totalCount;
  const counting = preview.isFetching;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="font-semibold">Filters</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <Group title="Day">
          {DAYS.map((day, index) => (
            <Chip
              key={day}
              active={draft.dayOfWeek === index}
              onClick={() => toggle('dayOfWeek', index)}
            >
              {day}
            </Chip>
          ))}
        </Group>

        <Group title="Time">
          {(Object.keys(TIME_PERIODS) as TimePeriod[]).map((period) => (
            <Chip
              key={period}
              active={draft.timePeriod === period}
              onClick={() => toggle('timePeriod', period)}
              title={TIME_PERIODS[period].hint}
            >
              {TIME_PERIODS[period].label}
              <span className="ml-1 text-xs opacity-70">{TIME_PERIODS[period].hint}</span>
            </Chip>
          ))}
        </Group>

        {options.isLoading && <p className="text-sm text-slate-500">Loading choices…</p>}
        {options.error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't load topics and languages. Day and time still work.
          </p>
        )}

        <OptionGroup
          title="Topic"
          values={options.data?.topics}
          selected={draft.topic}
          onPick={(v) => toggle('topic', v)}
        />
        <OptionGroup
          title="Language"
          values={options.data?.languages}
          selected={draft.language}
          onPick={(v) => toggle('language', v)}
        />
        <OptionGroup
          title="Audience"
          values={options.data?.audiences}
          selected={draft.audience}
          onPick={(v) => toggle('audience', v)}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setDraft(NO_FILTERS)}
          disabled={countActive(draft) === 0}
          className="text-sm font-medium text-slate-600 underline disabled:no-underline disabled:opacity-40 dark:text-slate-300"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          disabled={!location}
          aria-live="polite"
          className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {count === undefined
            ? counting
              ? 'Counting…'
              : 'Show shiurim'
            : `Show ${shiurimCount(count)}`}
        </button>
      </div>
    </div>
  );
}

/** A group of chips whose choices come from the server (topics, languages, audiences). */
function OptionGroup({
  title,
  values,
  selected,
  onPick,
}: {
  title: string;
  values: string[] | undefined;
  selected: string | undefined;
  onPick: (value: string) => void;
}) {
  // Nothing to choose from yet, so hide the group's heading too.
  if (!values || values.length === 0) return null;
  return (
    <Group title={title}>
      {values.map((value) => (
        <Chip key={value} active={selected === value} onClick={() => onPick(value)}>
          {value}
        </Chip>
      ))}
    </Group>
  );
}

/** A titled row of chips. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

/** One pill-shaped toggle button. */
function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
          : 'border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
      }`}
    >
      {children}
    </button>
  );
}
