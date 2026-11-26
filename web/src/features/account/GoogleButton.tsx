// "Continue with Google" (FR-2, Should), on the sign-in and sign-up pages.
// The same button does both: Google makes the account the first time.
//
// Without the server's Google key it says so, and email and password still
// work (design doc, "Errors").

import { useMutation } from '@tanstack/react-query';
import { messageFor } from '../../core/api';
import { signInWithGoogle } from './account.api';
import { ErrorBox } from './AuthShell';

export function GoogleButton({ redirect }: { redirect?: string }) {
  // On success the browser leaves for Google, so only an error comes back here.
  const go = useMutation({ mutationFn: () => signInWithGoogle(redirect) });

  return (
    <div className="space-y-3">
      <ErrorBox message={go.error ? messageFor(go.error) : null} />
      <button
        type="button"
        onClick={() => go.mutate()}
        disabled={go.isPending}
        className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        {go.isPending ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        or use your email
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
