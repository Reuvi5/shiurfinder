// /sign-up: name, email and password (FR-2). Then "check your email": they
// aren't signed in until they open the link in it.
//
// The answer is the same when the email already has an account, so nobody can
// check who has one. That person gets an email telling them to sign in
// (server/src/core/auth/auth.config.ts).

import { type FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { messageFor } from '../../core/api';
import { sendLinkAgain, signUp } from './account.api';
import { AuthShell, BUTTON, ErrorBox, FIELD, Field, LINK } from './AuthShell';
import { GoogleButton } from './GoogleButton';
import { currentDarkMode } from './useDarkMode';

/** Better Auth's shortest allowed password. */
const MIN_PASSWORD = 8;

export function SignUpPage() {
  const { redirect } = useSearch({ from: '/sign-up' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      signUp(
        { name: name.trim(), email: email.trim(), password, darkMode: currentDarkMode() },
        redirect,
      ),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate();
  }

  if (submit.isSuccess) {
    return <CheckEmail email={email.trim()} redirect={redirect} />;
  }

  return (
    <AuthShell title="Create an account">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        To save shiurim, follow shuls and get alerts. You don't need one to browse.
      </p>
      <GoogleButton redirect={redirect} />
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={submit.error ? messageFor(submit.error) : null} />
        <Field label="Name">
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD}
          />
        </Field>
        <Field label={`Password (at least ${MIN_PASSWORD} characters)`}>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD}
          />
        </Field>
        <button type="submit" disabled={submit.isPending} className={BUTTON}>
          {submit.isPending ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/sign-in" search={{ redirect }} className={LINK}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

/** After signing up: open the link in the email. Can send it again. */
function CheckEmail({ email, redirect }: { email: string; redirect?: string }) {
  const again = useMutation({ mutationFn: () => sendLinkAgain(email, redirect) });

  return (
    <AuthShell title="Check your email">
      <div className="space-y-3 text-sm">
        <p>
          We sent an email to <strong>{email}</strong>. Open the link in it to finish signing up.
          The link works for 1 hour.
        </p>
        {import.meta.env.DEV && (
          <p className="text-slate-500">
            While developing, emails aren't sent: the link is in the server's console.
          </p>
        )}
      </div>

      <ErrorBox message={again.error ? messageFor(again.error) : null} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => again.mutate()}
          disabled={again.isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {again.isPending ? 'Sending…' : 'Send it again'}
        </button>
        {again.isSuccess && <span className="text-slate-500">Sent.</span>}
        <Link to="/sign-in" search={{ redirect }} className={LINK}>
          Already opened it? Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
