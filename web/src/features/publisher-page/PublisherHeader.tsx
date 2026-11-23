// The top of a shul or maggid shiur page: picture, name, a line under it, and
// the buttons (Follow, and Directions for a shul).

import type { ReactNode } from 'react';

export function PublisherHeader({
  name,
  subtitle,
  children,
}: {
  name: string;
  /** e.g. the shul's address */
  subtitle?: string | null;
  /** extra buttons, shown before Follow */
  children?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-4">
      <Initials name={name} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold leading-tight">{name}</h1>
        {subtitle && <p className="mt-1 text-slate-600 dark:text-slate-400">{subtitle}</p>}
        <div className="mt-3 flex gap-2">
          {children}
          {/* Following needs an account (FR-12), so this stays disabled until accounts are built. */}
          <button
            type="button"
            disabled
            title="Sign in to follow — coming with the accounts module"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-700"
          >
            Follow
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Stands in for the logo or photo. Images live in S3, which isn't set up yet,
 * so for now this shows up to two initials ("Young Israel" -> "YI").
 */
function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {letters || '?'}
    </div>
  );
}
