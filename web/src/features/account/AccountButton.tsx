// The map header's account corner: the dark mode switch, and "Sign in" for
// a guest or their name (a link to /account) once signed in (FR-2, FR-4).
//
// Signing in from here comes back to the same page (?redirect=).

import { Link, useRouterState } from '@tanstack/react-router';
import { useCurrentUser } from '../../core/auth';
import { useDarkMode } from './useDarkMode';

const BUTTON =
  'rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900';

export function AccountButton() {
  const { user, isChecking } = useCurrentUser();
  const here = useRouterState({ select: (state) => state.location.href });
  const [dark, setDark] = useDarkMode();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDark(!dark)}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={dark ? 'Light mode' : 'Dark mode'}
        className={BUTTON}
      >
        {dark ? '☀' : '☾'}
      </button>
      {/* Nothing until we know, so a signed-in user doesn't see "Sign in" flash. */}
      {!isChecking &&
        (user ? (
          <Link to="/account" className={`${BUTTON} max-w-[9rem] truncate`}>
            {user.name ?? 'Account'}
          </Link>
        ) : (
          <Link to="/sign-in" search={{ redirect: here }} className={BUTTON}>
            Sign in
          </Link>
        ))}
    </div>
  );
}
