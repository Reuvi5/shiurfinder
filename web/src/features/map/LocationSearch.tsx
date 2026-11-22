// The address box: type an address or zip code, Google suggests matches, and
// picking one moves the search to that spot. Also holds the "use my location" button.
//
// Uses Google's newer Places API (AutocompleteSuggestion), because the older
// Autocomplete widget isn't available to new Google Cloud projects.
//
// Billing: Google charges per "session". One session token covers all the
// typing plus the final lookup, so one search costs one session, not one per keystroke.
//
// The chosen point is only kept in the page's memory, never saved (NFR-5).

import { useEffect, useId, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { HAS_MAPS_KEY } from '../../core/config';
import type { SearchLocation } from './useSearchLocation';

interface LocationSearchProps {
  /** Biases suggestions toward where the user already is. */
  near: { lat: number; lng: number };
  onSelect: (location: SearchLocation) => void;
  onUseMyLocation: () => void;
  locating: boolean;
}

export function LocationSearch(props: LocationSearchProps) {
  // Google's address lookup only works with a Maps key (see App.tsx).
  return HAS_MAPS_KEY ? <PlacesSearch {...props} /> : <NoKeySearch {...props} />;
}

function PlacesSearch({ near, onSelect, onUseMyLocation, locating }: LocationSearchProps) {
  const places = useMapsLibrary('places');
  const listId = useId();

  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [resolving, setResolving] = useState(false);

  // The billing session token (see the top of this file).
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  // Numbers each request. If an older, slower request finishes after a newer
  // one, its results are ignored so they don't overwrite the newer ones.
  const requestRef = useRef(0);

  // Fetch suggestions 250ms after the user stops typing.
  useEffect(() => {
    const input = text.trim();
    if (!places || input.length < 2) {
      setSuggestions([]);
      return;
    }

    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      tokenRef.current ??= new places.AutocompleteSessionToken();
      try {
        const { suggestions: found } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: tokenRef.current,
            includedRegionCodes: ['us'],
            locationBias: near,
          });
        if (request !== requestRef.current) return;
        setSuggestions(
          found
            .map((s) => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => p !== null),
        );
        setHighlighted(0);
      } catch {
        if (request === requestRef.current) setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
    // `near` is only a bias; re-querying every time it changes isn't worth it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, places]);

  /** The user picked a suggestion: look up its exact point and send it up. */
  async function choose(prediction: google.maps.places.PlacePrediction) {
    setResolving(true);
    setOpen(false);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'formattedAddress'] });
      if (!place.location) {
        setNotFound(true);
        return;
      }
      const label = (place.formattedAddress ?? prediction.text.text).replace(/, USA$/, '');
      setText(label);
      setSuggestions([]);
      onSelect({ lat: place.location.lat(), lng: place.location.lng(), label });
    } catch {
      setNotFound(true);
    } finally {
      // The session ends with the lookup; the next search starts a new one.
      tokenRef.current = null;
      setResolving(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const pick = suggestions[highlighted] ?? suggestions[0];
      // Enter with no suggestions: tell the user we couldn't find it.
      if (pick) void choose(pick);
      else if (text.trim()) setNotFound(true);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && suggestions.length > 0;

  return (
    <div className="space-y-1">
      <div className="relative flex gap-2">
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Address or zip code"
          aria-invalid={notFound}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setNotFound(false);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a suggestion lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Address or zip code"
          autoComplete="off"
          className={`min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none dark:bg-slate-900 ${
            notFound
              ? 'border-red-400 focus:border-red-500 dark:border-red-700'
              : 'border-slate-300 focus:border-slate-900 dark:border-slate-700 dark:focus:border-slate-400'
          }`}
        />
        <MyLocationButton onClick={onUseMyLocation} busy={locating} />

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-11 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {suggestions.map((prediction, index) => (
              <li
                key={prediction.placeId}
                role="option"
                aria-selected={index === highlighted}
                // mousedown, not click: fires before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  void choose(prediction);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlighted ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <span className="font-medium">
                  {prediction.mainText?.text ?? prediction.text.text}
                </span>
                {prediction.secondaryText && (
                  <span className="text-slate-500"> · {prediction.secondaryText.text}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {notFound && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Address not found. Check it and try again.
        </p>
      )}
      {resolving && <p className="text-xs text-slate-500">Finding that address…</p>}
    </div>
  );
}

/** Without a Maps key there's nothing to look an address up with. */
function NoKeySearch({ onUseMyLocation, locating }: LocationSearchProps) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        disabled
        aria-label="Address or zip code"
        placeholder="Address search needs a Google Maps key"
        className="min-w-0 flex-1 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900"
      />
      <MyLocationButton onClick={onUseMyLocation} busy={locating} />
    </div>
  );
}

/** The crosshair button that asks the browser for the user's location. */
function MyLocationButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Use my location"
      aria-label="Use my location"
      className="flex h-[34px] w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    </button>
  );
}
