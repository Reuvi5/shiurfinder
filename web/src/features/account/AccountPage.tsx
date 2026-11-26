// /account: the signed-in user's settings (FR-4). Name, topics of interest,
// which alerts they want, dark mode, signing out, and deleting the account.
//
// Each change saves on its own (PATCH /account), so there's no Save button to
// forget, except for the name, which saves when they press Save.
// A guest is sent to sign in, and comes back here after.

import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { AccountChanges, AccountSettings, AlertChoices } from '@shiurfinder/shared';
import { messageFor } from '../../core/api';
import { useCurrentUser } from '../../core/auth';
import {
  ACCOUNT_QUERY_KEY,
  changeSettings,
  deleteAccount,
  refreshSignedInUser,
  signOut,
  useAccountSettings,
} from './account.api';
import { BUTTON, ErrorBox, FIELD, LINK } from './AuthShell';
import { useDarkMode } from './useDarkMode';

/** The alert switches, in the order shown. */
const ALERTS: { key: keyof AlertChoices; label: string }[] = [
  { key: 'newShiur', label: 'A shul or maggid shiur I follow posts a new shiur' },
  { key: 'changed', label: 'A shiur I saved changes its time or place' },
  { key: 'cancelled', label: 'A shiur I saved is cancelled' },
  { key: 'reminders', label: 'A reminder before a shiur I saved' },
];

export function AccountPage() {
  const { user, isChecking } = useCurrentUser();
  const navigate = useNavigate();
  const [deleted, setDeleted] = useState(false);
  const settings = useAccountSettings(user !== null);

  // A guest: sign in first, then come back here.
  useEffect(() => {
    if (!isChecking && !user && !deleted) {
      void navigate({ to: '/sign-in', search: { redirect: '/account' }, replace: true });
    }
  }, [isChecking, user, deleted, navigate]);

  if (deleted) return <Deleted />;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div>
        <Link to="/" className={`text-sm ${LINK}`}>
          ← Back to the map
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Account</h1>
        {settings.data && <p className="text-sm text-slate-500">{settings.data.email}</p>}
      </div>

      {settings.isLoading && <p className="text-slate-500">Loading…</p>}
      <ErrorBox message={settings.error ? messageFor(settings.error) : null} />
      {settings.data && <Settings settings={settings.data} onDeleted={() => setDeleted(true)} />}
    </main>
  );
}

/** Every section, once the settings have loaded. */
function Settings({ settings, onDeleted }: { settings: AccountSettings; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (changes: AccountChanges) => changeSettings(changes),
    onSuccess: (next, changes) => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEY, next);
      // The name also shows in the map's header.
      if (changes.name !== undefined) refreshSignedInUser();
    },
  });

  return (
    <>
      <ErrorBox message={save.error ? messageFor(save.error) : null} />
      <NameSection
        name={settings.name}
        saving={save.isPending}
        onSave={(name) => save.mutate({ name })}
      />
      <TopicsSection settings={settings} onChange={(topicIds) => save.mutate({ topicIds })} />
      <AlertsSection alerts={settings.alerts} onChange={(alerts) => save.mutate({ alerts })} />
      <AppearanceSection />
      <LeaveSection onDeleted={onDeleted} />
    </>
  );
}

// ------------- sections

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function NameSection({
  name,
  saving,
  onSave,
}: {
  name: string | null;
  saving: boolean;
  onSave: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name ?? '');
  const unchanged = draft.trim() === (name ?? '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onSave(draft.trim());
  }

  return (
    <Section title="Name">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          required
          maxLength={80}
          autoComplete="name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={FIELD}
          aria-label="Name"
        />
        <button
          type="submit"
          disabled={saving || unchanged}
          className={`${BUTTON} w-auto shrink-0`}
        >
          Save
        </button>
      </form>
    </Section>
  );
}

function TopicsSection({
  settings,
  onChange,
}: {
  settings: AccountSettings;
  onChange: (topicIds: string[]) => void;
}) {
  const picked = new Set(settings.topicIds);

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <Section title="Topics I'm interested in" hint="Used to recommend shiurim to you.">
      {settings.topicChoices.length === 0 ? (
        <p className="text-sm text-slate-500">No topics yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {settings.topicChoices.map((topic) => {
            const on = picked.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(topic.id)}
                className={
                  on
                    ? 'rounded-full bg-slate-900 px-3 py-1 text-sm text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900'
                }
              >
                {topic.name}
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function AlertsSection({
  alerts,
  onChange,
}: {
  alerts: AlertChoices;
  onChange: (alerts: Partial<AlertChoices>) => void;
}) {
  return (
    <Section title="Alerts" hint="What we let you know about.">
      <div className="space-y-2">
        {ALERTS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alerts[key]}
              onChange={(event) => onChange({ [key]: event.target.checked })}
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </div>
    </Section>
  );
}

function AppearanceSection() {
  const [dark, setDark] = useDarkMode();
  return (
    <Section title="Appearance">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dark}
          onChange={(event) => setDark(event.target.checked)}
          className="h-4 w-4"
        />
        Dark mode
      </label>
    </Section>
  );
}

/** Sign out, and delete the account. */
function LeaveSection({ onDeleted }: { onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const out = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      void navigate({ to: '/' });
    },
  });

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      onDeleted();
      // Nothing of theirs should stay on the page, and the header should say "Sign in".
      queryClient.clear();
      refreshSignedInUser();
    },
  });

  function onDelete() {
    const sure = window.confirm(
      "Delete your account? This removes your saved shiurim, follows and settings, and can't be undone.",
    );
    if (sure) remove.mutate();
  }

  return (
    <Section title="Sign out or delete">
      <ErrorBox
        message={out.error ? messageFor(out.error) : remove.error ? messageFor(remove.error) : null}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => out.mutate()}
          disabled={out.isPending}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          Sign out
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={remove.isPending}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {remove.isPending ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </Section>
  );
}

/** Shown after deleting (FR-4's "deletion confirmation"). */
function Deleted() {
  return (
    <main className="mx-auto max-w-sm space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Your account is deleted</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Your saved shiurim, follows and settings are gone. You can still use ShiurFinder without an
        account.
      </p>
      <Link to="/" className={`text-sm ${LINK}`}>
        Back to the map
      </Link>
    </main>
  );
}
