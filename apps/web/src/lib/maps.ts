/**
 * The browser Maps key. Public by design (it ships to the browser); the HTTP
 * referrer restriction in the Cloud console is what protects it.
 *
 * Empty means no key yet: the map shows setup instructions and the address box
 * is disabled, but the lists, search and filters still work.
 */
export const BROWSER_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? '';

export const HAS_MAPS_KEY = BROWSER_KEY.length > 0;
