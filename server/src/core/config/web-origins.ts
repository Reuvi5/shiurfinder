// The website addresses allowed to call the server with login cookies.
// Used for CORS (app.setup.ts) and by Better Auth (core/auth/auth.config.ts),
// so the two can never disagree.

/** WEB_ORIGIN from .env, comma separated. The website runs on 5173 in development. */
export function webOrigins(): string[] {
  return (
    process.env.WEB_ORIGIN?.split(',').map((origin) => origin.trim()) ?? ['http://localhost:5173']
  );
}
