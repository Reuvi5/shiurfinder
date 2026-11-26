// /reset-password?token=…: choose a new password (FR-2). The link in the
// "forgot password" email opens this page through the server, which adds the
// token, or ?error=INVALID_TOKEN if the link is used or over an hour old.
//
// A new password signs them out everywhere, so afterwards they sign in again.

import { type FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { ApiRequestError, messageFor } from '../../core/api';
import { chooseNewPassword } from './account.api';
import { resetError } from './account.errors';
import { AuthShell, BUTTON, ErrorBox, FIELD, Field, LINK } from './AuthShell';

/** Better Auth's shortest allowed password. */
const MIN_PASSWORD = 8;

export function ResetPasswordPage() {
  const { token, error } = useSearch({ from: '/reset-password' });
  const [password, setPassword] = useState('');
  const save = useMutation({ mutationFn: () => chooseNewPassword(token!, password) });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  // No token, or the server said the link is no good: nothing to do here.
  if (error || !token) {
    const message = messageFor(resetError(new ApiRequestError('INVALID_TOKEN', error ?? '')));
    return (
      <AuthShell title="Choose a new password">
        <ErrorBox message={message} />
        <Link to="/forgot-password" className={`text-sm ${LINK}`}>
          Send me a new link
        </Link>
      </AuthShell>
    );
  }

  if (save.isSuccess) {
    return (
      <AuthShell title="Password changed">
        <p className="text-sm">You're signed out everywhere. Sign in with your new password.</p>
        <Link to="/sign-in" className={`text-sm ${LINK}`}>
          Sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={save.error ? messageFor(resetError(save.error)) : null} />
        <Field label={`New password (at least ${MIN_PASSWORD} characters)`}>
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
        <button type="submit" disabled={save.isPending} className={BUTTON}>
          {save.isPending ? 'Saving…' : 'Save new password'}
        </button>
      </form>
      {save.error && (
        <Link to="/forgot-password" className={`text-sm ${LINK}`}>
          Send me a new link
        </Link>
      )}
    </AuthShell>
  );
}
