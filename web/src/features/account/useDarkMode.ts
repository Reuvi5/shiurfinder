// The site's dark mode (FR-4): one choice for every page.
//
//   const [dark, setDark] = useDarkMode();
//
// A guest's choice is kept in the browser (dark-mode.ts). Signed in, the
// account's choice wins: DarkModeSync copies it into the browser, and
// setDark saves to the account too. The `dark` class on <html> is what
// Tailwind's `dark:` styles look for.

import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../../core/auth';
import { changeSettings, ACCOUNT_QUERY_KEY, useAccountSettings } from './account.api';
import { DARK_MODE_KEY, parseStored, pickDarkMode } from './dark-mode';

const listeners = new Set<() => void>();

/** The mode to show now. */
export function currentDarkMode(): boolean {
  let stored: boolean | null = null;
  try {
    stored = parseStored(localStorage.getItem(DARK_MODE_KEY));
  } catch {
    // Storage can be blocked (some private windows). Then follow the device.
  }
  return pickDarkMode(stored, window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** Keeps the choice in the browser and tells every useDarkMode() on the page. */
function store(dark: boolean): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, String(dark));
  } catch {
    // Blocked storage: it still changes for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether dark mode is on, and a way to change it. */
export function useDarkMode(): [boolean, (dark: boolean) => void] {
  const dark = useSyncExternalStore(subscribe, currentDarkMode);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (next: boolean) => changeSettings({ darkMode: next }),
    onSuccess: (settings) => queryClient.setQueryData(ACCOUNT_QUERY_KEY, settings),
  });

  function setDark(next: boolean) {
    store(next);
    if (user) save.mutate(next);
  }
  return [dark, setDark];
}

/**
 * Puts the chosen mode on the page, and when someone signs in, switches to
 * their account's choice. Mounted once, at the top of every page (routes.tsx).
 */
export function DarkModeSync() {
  const [dark] = useDarkMode();
  const { user } = useCurrentUser();
  const settings = useAccountSettings(user !== null);
  const accountDark = settings.data?.darkMode;

  useEffect(() => {
    if (accountDark !== undefined) store(accountDark);
  }, [accountDark]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return null;
}
