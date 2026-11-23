// The "Post a shiur" form (FR-20). Display and input only: PortalPage loads
// the choices and does the saving.
//
// Weekly shiurim pick days of the week; featured (one-time) ones pick a date.
// Times are New York time, like everywhere else on the site.
//
// The shul, maggid shiur, room, topic and language are Comboboxes: pick from
// the list or type a new name. A new shul also needs its address, picked from
// Google's suggestions (the map's LocationSearch), so it gets a pin.

import { useState } from 'react';
import type { NewShiur, PortalOptions, ShiurKind } from '@shiurfinder/shared';
import { ApiRequestError, messageFor } from '../../core/api';
import { HAS_MAPS_KEY } from '../../core/config';
import { LocationSearch } from '../map/LocationSearch';
import { DEFAULT_LOCATION } from '../map/useSearchLocation';
import { Combobox, toPick } from './Combobox';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The choices in the Length dropdown, in minutes. */
const LENGTHS = [15, 30, 45, 60, 75, 90, 120];

/** Today in New York as "2026-11-22", so the date picker can't go earlier. */
function todayNy(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400';

export function ShiurForm({
  options,
  saving,
  error,
  onSubmit,
}: {
  options: PortalOptions;
  saving: boolean;
  /** the last save's error, if it failed */
  error: Error | null;
  onSubmit: (shiur: NewShiur) => void;
}) {
  const [kind, setKind] = useState<ShiurKind>('WEEKLY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // The Comboboxes hold text; toPick() turns it into an id or a new name on submit.
  const [shulText, setShulText] = useState('');
  const [roomText, setRoomText] = useState('');
  const [maggidText, setMaggidText] = useState('');
  /** A new shul's address and point, from the address search. */
  const [newShulPlace, setNewShulPlace] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [topicText, setTopicText] = useState('');
  const [languageText, setLanguageText] = useState('');
  const [audienceId, setAudienceId] = useState('');
  // Only show "pick a day" after they've tried to post, not while they're still filling in.
  const [tried, setTried] = useState(false);

  const shulPick = toPick(shulText, options.shuls);
  const pickedShul = shulPick && 'id' in shulPick ? shulPick : null;
  const shulIsNew = shulPick !== undefined && !pickedShul;
  // A new shul has no rooms yet, so any room typed for it is new too.
  const rooms = options.shuls.find((shul) => shul.id === pickedShul?.id)?.rooms ?? [];
  const missingDays = kind === 'WEEKLY' && days.length === 0;
  const missingAddress = shulIsNew && !newShulPlace;

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (missingDays || missingAddress || !shulPick) return;

    const common = {
      title,
      description,
      shul: pickedShul ?? { name: shulText.trim(), ...newShulPlace! },
      room: toPick(roomText, rooms),
      maggidShiur: toPick(maggidText, options.maggideiShiur),
      topic: toPick(topicText, options.topics),
      language: toPick(languageText, options.languages),
      audienceId,
      startTime,
      durationMinutes,
    };
    onSubmit(kind === 'WEEKLY' ? { ...common, kind, daysOfWeek: days } : { ...common, kind, date });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Kind</legend>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          <KindButton active={kind === 'WEEKLY'} onClick={() => setKind('WEEKLY')}>
            Weekly
          </KindButton>
          <KindButton active={kind === 'FEATURED'} onClick={() => setKind('FEATURED')}>
            One-time (featured)
          </KindButton>
        </div>
      </fieldset>

      <Field label="Title">
        <input
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Daf Yomi"
          className={FIELD}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shul">
          <Combobox
            required
            noun="shul"
            text={shulText}
            onTextChange={setShulText}
            choices={options.shuls}
            placeholder="Pick or type a shul"
          />
        </Field>

        <Field label="Room" optional>
          <Combobox
            noun="room"
            text={roomText}
            onTextChange={setRoomText}
            choices={rooms}
            disabled={!shulPick}
            placeholder={shulPick ? 'Pick or type a room' : 'Pick a shul first'}
          />
        </Field>
      </div>

      {shulIsNew && (
        // A div, not a Field label: the address box has its own label.
        <div className="space-y-1.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-sm font-medium">New shul’s address</p>
          {HAS_MAPS_KEY ? (
            <LocationSearch
              near={DEFAULT_LOCATION}
              placeholder="Start typing the address, then pick it"
              onSelect={(place) =>
                setNewShulPlace({ address: place.label, lat: place.lat, lng: place.lng })
              }
            />
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              Adding a new shul needs a Google Maps key, to find where it is.
            </p>
          )}
          {newShulPlace ? (
            <p className="text-xs text-slate-500">Pin goes at: {newShulPlace.address}</p>
          ) : (
            tried && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Pick the address from the suggestions, so the shul gets a pin on the map.
              </p>
            )
          )}
        </div>
      )}

      <Field label="Maggid shiur" optional>
        <Combobox
          noun="maggid shiur"
          text={maggidText}
          onTextChange={setMaggidText}
          choices={options.maggideiShiur}
          placeholder="Pick or type a name"
        />
      </Field>

      {kind === 'WEEKLY' ? (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAY_NAMES.map((name, day) => (
              <label
                key={name}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium ${
                  days.includes(day)
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="sr-only"
                />
                {name}
              </label>
            ))}
          </div>
          {tried && missingDays && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">Pick at least one day.</p>
          )}
        </fieldset>
      ) : (
        <Field label="Date">
          <input
            type="date"
            required
            min={todayNy()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={FIELD}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start time (New York)">
          <input
            type="time"
            required
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className={FIELD}
          />
        </Field>
        <Field label="Length">
          <select
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            className={FIELD}
          >
            {LENGTHS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Topic" optional>
          <Combobox
            noun="topic"
            text={topicText}
            onTextChange={setTopicText}
            choices={options.topics}
            placeholder="Pick or type"
          />
        </Field>
        <Field label="Language" optional>
          <Combobox
            noun="language"
            text={languageText}
            onTextChange={setLanguageText}
            choices={options.languages}
            placeholder="Pick or type"
          />
        </Field>
        <Field label="Audience" optional>
          <Choices value={audienceId} onChange={setAudienceId} choices={options.audiences} />
        </Field>
      </div>

      <Field label="Description" optional>
        <textarea
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What it's about, who it's for, anything people should know"
          className={FIELD}
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorText(error)}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {saving ? 'Posting…' : 'Post shiur'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- pieces

/**
 * The server's own wording for a form mistake (e.g. "that room is not in this
 * shul"), since the general message only says something wasn't valid.
 */
function errorText(error: Error): string {
  if (error instanceof ApiRequestError && error.code === 'INVALID_REQUEST') {
    return `Check the form: ${error.message.replace(/^[\w.]+: /, '')}`;
  }
  return messageFor(error);
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-slate-500"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}

/** A dropdown of choices where "none" is allowed. */
function Choices({
  value,
  onChange,
  choices,
}: {
  value: string;
  onChange: (next: string) => void;
  choices: { id: string; name: string }[];
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
      <option value="">None</option>
      {choices.map((choice) => (
        <option key={choice.id} value={choice.id}>
          {choice.name}
        </option>
      ))}
    </select>
  );
}

function KindButton({
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
      aria-pressed={active}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-white shadow-sm dark:bg-slate-800'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
