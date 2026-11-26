// "Sign in" for a guest, or who is signed in and "Sign out" (FR-2). In the
// map screen's header.
//
// Signing in from here comes back to the same page (?redirect=).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { messageFor } from '../../core/api';
import { useCurrentUser } from '../../core/auth';
import { signOut } from './account.api';

const BUTTON =
  'rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900';

export function AccountButton() {
  const { user, isChecking } = useCurrentUser();
  const here = useRouterState({ select: (state) => state.location.href });
  const queryClient = useQueryClient();
  const out = useMutation({
    mutationFn: signOut,
    // Pages that showed the user's own things (saves, follows) load them again.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  // Nothing until we know, so a signed-in user doesn't see "Sign in" flash.
  if (isChecking) return null;

  if (!user) {
    return (
      <Link to="/sign-in" search={{ redirect: here }} className={BUTTON}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[8rem] truncate text-sm text-slate-600 dark:text-slate-400">
        {user.name ?? user.email}
      </span>
      <button
        type="button"
        onClick={() => out.mutate()}
        disabled={out.isPending}
        title={out.error ? messageFor(out.error) : undefined}
        className={BUTTON}
      >
        {out.error ? 'Try again' : 'Sign out'}
      </button>
    </div>
  );
}
