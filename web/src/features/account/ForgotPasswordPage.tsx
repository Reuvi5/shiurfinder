// /forgot-password: emails a link to choose a new password (FR-2). The link
// leads to /reset-password (ResetPasswordPage.tsx).
//
// The answer is the same whether or not the email has an account, so nobody
// can use this page to check who has one.

import { type FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { messageFor } from '../../core/api';
import { askForResetLink } from './account.api';
import { AuthShell, BUTTON, ErrorBox, FIELD, Field, LINK } from './AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const send = useMutation({ mutationFn: () => askForResetLink(email.trim()) });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send.mutate();
  }

  if (send.isSuccess) {
    return (
      <AuthShell title="Check your email">
        <div className="space-y-3 text-sm">
          <p>
            If <strong>{email.trim()}</strong> has an account, we sent it a link to choose a new
            password. The link works once, for 1 hour.
          </p>
          {import.meta.env.DEV && (
            <p className="text-slate-500">
              No email? Until SES is set up on your computer, the link is in the server's console.
            </p>
          )}
        </div>
        <Link to="/sign-in" className={`text-sm ${LINK}`}>
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enter your email and we'll send you a link to choose a new one.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={send.error ? messageFor(send.error) : null} />
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
        <button type="submit" disabled={send.isPending} className={BUTTON}>
          {send.isPending ? 'Sending…' : 'Send me a link'}
        </button>
      </form>
      <Link to="/sign-in" className={`text-sm ${LINK}`}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
