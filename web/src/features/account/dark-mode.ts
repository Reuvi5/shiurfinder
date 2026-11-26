// Which mode to show, light or dark (FR-4). The choice is kept in the
// browser, so guests have one too. Signed in, the account's choice wins and
// is copied here (useDarkMode.ts).
//
// index.html reads the same key before the page draws, so a dark page
// doesn't flash white first. Change DARK_MODE_KEY there too.

/** Where the browser keeps the choice: "true" or "false". */
export const DARK_MODE_KEY = 'shiurfinder.darkMode';

/** The saved choice, or null if there's none (never chosen, or junk). */
export function parseStored(value: string | null): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

/** The mode to show: the saved choice, or the device's own setting if there isn't one. */
export function pickDarkMode(stored: boolean | null, deviceIsDark: boolean): boolean {
  return stored ?? deviceIsDark;
}
