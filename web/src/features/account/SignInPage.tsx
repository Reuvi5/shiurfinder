// /sign-in: email and password, or Google (FR-2). Afterwards it goes to
// ?redirect=, the page that sent them here (FR-1), or the map.
//
// The verification email's link and Google sign-in also land here, already
// signed in, so it just passes them through. If either failed, ?error= says why.

import { type FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { messageFor } from '../../core/api';
import { useCurrentUser } from '../../core/auth';
import { signIn } from './account.api';
import { redirectError } from './account.errors';
import { safeRedirect } from './account.search';
import { AuthShell, BUTTON, ErrorBox, FIELD, Field, LINK } from './AuthShell';
import { GoogleButton } from './GoogleButton';

export function SignInPage() {
  const { redirect, error } = useSearch({ from: '/sign-in' });
  const next = safeRedirect(redirect);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: (form: { email: string; password: string }) => signIn(form, redirect),
    // Pages that show the user's own things (saves, follows) load them again.
    onSuccess: () => queryClient.invalidateQueries(),
  });

  // Signed in (just now, by the email link, or before): go on. `replace`, so
  // Back skips this page.
  useEffect(() => {
    if (user) void navigate({ href: next, replace: true });
  }, [user, next, navigate]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate({ email: email.trim(), password });
  }

  const message = submit.error
    ? messageFor(submit.error)
    : error && !submit.isPending
      ? messageFor(redirectError(error))
      : null;

  return (
    <AuthShell title="Sign in">
      <GoogleButton redirect={redirect} />
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={message} />
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
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD}
          />
        </Field>
        <button type="submit" disabled={submit.isPending} className={BUTTON}>
          {submit.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        New to ShiurFinder?{' '}
        <Link to="/sign-up" search={{ redirect }} className={LINK}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
