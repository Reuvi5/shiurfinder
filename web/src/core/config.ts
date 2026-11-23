// Settings the website reads from the .env file at the repo root.
//
// Vite only gives the browser variables whose names start with VITE_, and
// anything here ends up in the public JavaScript. Never put a secret in a VITE_ variable.

/** Where the server is running. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * The Google Maps browser key. It's public by design (the browser needs it);
 * the website-address restriction set in the Google Cloud console is what protects it.
 *
 * With no key, the map area shows setup instructions and address search is
 * turned off. The lists, search box and filters still work.
 */
export const MAPS_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? '';

export const HAS_MAPS_KEY = MAPS_KEY.length > 0;

/**
 * The Map ID from the Google Cloud console. Pins and popups are Advanced
 * Markers, which only draw on a map with a real Map ID: with a made-up one
 * the map loads but every pin is silently missing. Public, like the key.
 * Falls back to Google's DEMO_MAP_ID, which works for development.
 */
export const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
