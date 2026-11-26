// The frame the sign-in and sign-up pages share: a link back to the map, a
// heading, and the form below it. Also the input and button styles they use.

import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400';

export const BUTTON =
  'w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300';

export const LINK = 'font-medium text-sky-700 underline dark:text-sky-400';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-sm space-y-6 px-4 py-10">
      <div>
        <Link to="/" className={`text-sm ${LINK}`}>
          ← Back to the map
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      </div>
      {children}
    </main>
  );
}

/** A label above its input. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** A red box for an error, or nothing. */
export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}
