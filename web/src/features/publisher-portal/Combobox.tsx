// A dropdown you can also type in: the list narrows as you type, and a name
// that isn't in it can be added as new. Used for the shul, maggid shiur,
// room, topic and language in ShiurForm.
//
// It only holds the text. toPick() below turns that text into what the server
// wants: the id of a matching choice, or the typed name to add.

import { useId, useState } from 'react';
import type { PickOrNew, PortalChoice } from '@shiurfinder/shared';

/**
 * The text as the server wants it. A choice whose name matches (ignoring
 * capitals and spaces at the ends) gives its id; anything else is a new name.
 * Empty text gives undefined.
 */
export function toPick(text: string, choices: PortalChoice[]): PickOrNew | undefined {
  const typed = text.trim();
  if (!typed) return undefined;
  const match = findChoice(typed, choices);
  return match ? { id: match.id } : { name: typed };
}

/** True when the text is filled in but isn't one of the choices. */
export function isNew(text: string, choices: PortalChoice[]): boolean {
  return text.trim() !== '' && !findChoice(text.trim(), choices);
}

function findChoice(typed: string, choices: PortalChoice[]): PortalChoice | undefined {
  const lower = typed.toLowerCase();
  return choices.find((choice) => choice.name.toLowerCase() === lower);
}

export function Combobox({
  text,
  onTextChange,
  choices,
  placeholder,
  required,
  disabled,
  noun,
}: {
  text: string;
  onTextChange: (next: string) => void;
  choices: PortalChoice[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** what one choice is, for the "New maggid shiur" note, e.g. "maggid shiur" */
  noun: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const typed = text.trim().toLowerCase();
  // With nothing typed (or an exact match picked), show the whole list.
  const exact = findChoice(text.trim(), choices);
  const shown =
    typed && !exact ? choices.filter((c) => c.name.toLowerCase().includes(typed)) : choices;
  const showList = open && !disabled && shown.length > 0;

  function choose(choice: PortalChoice) {
    onTextChange(choice.name);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      if (shown.length > 0) setHighlighted((i) => (i + 1) % shown.length);
    } else if (event.key === 'ArrowUp' && shown.length > 0) {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + shown.length) % shown.length);
    } else if (event.key === 'Enter' && showList) {
      // Enter picks the highlighted choice instead of sending the form.
      event.preventDefault();
      const pick = shown[highlighted];
      if (pick) choose(pick);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          required={required}
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            onTextChange(event.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a choice lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
        />
        {/* The arrow opens the full list, like a normal dropdown. */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show choices"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            setOpen((now) => !now);
          }}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-slate-400"
        >
          ▾
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {shown.map((choice, index) => (
            <li
              key={choice.id}
              role="option"
              aria-selected={index === highlighted}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(choice);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlighted ? 'bg-slate-100 dark:bg-slate-800' : ''
              }`}
            >
              {choice.name}
            </li>
          ))}
        </ul>
      )}

      {isNew(text, choices) && (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          New {noun}: “{text.trim()}” will be added.
        </p>
      )}
    </div>
  );
}
