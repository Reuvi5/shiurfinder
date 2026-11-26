# API

Every route the server answers, its error codes, and the outside services the
app uses. The exact shapes of each request and reply are the types in
`shared/` (named below), so this file doesn't repeat them.

For how the code behind each route is laid out, see
[architecture.md](architecture.md).

## Routes

The server runs on http://localhost:3000. "Sign-in" says whether the route
needs an account (`@UseGuards(SignedInGuard)`, see `server/src/core/auth/`).

| Route | What it does | Sign-in | Input | Reply (in `shared/`) | Errors |
| --- | --- | --- | --- | --- | --- |
| `GET /health` | Is the server up, can it reach the database | No | none | `{ status, db, postgis }` | none (`db: "down"` instead, only if the database goes down after the server started: it won't start without one. Use `npm run db:status` then) |
| `GET /map/search` | Pins and the Weekly and Featured lists (FR-5, FR-8) | No | `lat`, `lng` (required); `radiusMiles` (up to 100), `q`, `topic`, `language`, `audience`, `dayOfWeek` (0 = Sunday), `afterTime`, `beforeTime` (`"19:30"`) | `MapSearchResult` (map.ts) | `INVALID_REQUEST` |
| `GET /map/filters` | The choices the Filters panel offers | No | none | `FilterOptions` (map.ts) | none |
| `GET /map/shul/:id/today` | The card that opens when a pin is clicked | No | `lat`, `lng` (optional, for distance) | `ShulTodayResult` (map.ts) | `SHUL_NOT_FOUND`, `INVALID_REQUEST` |
| `GET /shiur-page/:occurrenceId` | One date of a shiur (FR-9) | No | `lat`, `lng` (optional, for distance) | `ShiurDetails` (shiur-page.ts) | `SHIUR_NOT_FOUND`, `INVALID_REQUEST` |
| `GET /publishers/:id` | A shul's or maggid shiur's page (FR-10). Check `type` in the reply | No | none | `PublisherPageResult` (publishers.ts) | `PUBLISHER_NOT_FOUND` |
| `GET /portal/options` | What the "Post a shiur" form's lists offer (FR-20) | No, for now | none | `PortalOptions` (portal.ts) | none |
| `POST /portal/shiurim` | Post a weekly or featured shiur (FR-20) | No, for now | body: `NewShiur` (portal.ts) | `NewShiurResult` (portal.ts) | `INVALID_REQUEST`, `SHUL_NOT_FOUND`, `DATE_PASSED` |
| `GET /account` | The signed-in user's settings, and every topic they can pick (FR-4) | Yes | none | `AccountSettings` (account.ts) | `NOT_SIGNED_IN` |
| `PATCH /account` | Change some settings; anything left out stays. Returns all of them (FR-4) | Yes | body: `AccountChanges` (account.ts) | `AccountSettings` (account.ts) | `NOT_SIGNED_IN`, `INVALID_REQUEST` (also for a topic that doesn't exist) |
| `DELETE /account` | Delete the account and all its personal data; signs them out (FR-4) | Yes | none | nothing (204) | `NOT_SIGNED_IN` |
| `/auth/...` | Sign up, sign in, sign out, who is signed in, the email link (FR-2). Answered by Better Auth, not our code. Signing in needs a verified email | No | see [Better Auth's list](https://www.better-auth.com/docs/concepts/api) | Better Auth's own | Better Auth's own, e.g. `EMAIL_NOT_VERIFIED`, `INVALID_EMAIL_OR_PASSWORD` (their wording is in `web/src/core/api.ts` too) |

The portal is open to everyone until accounts are built. Then only a shul's
own team may post for it (NFR-4).

An unapproved shul, maggid shiur or shiur answers the same "not found" as a
missing one, so nobody can tell it exists before a moderator approves it (NFR-4).

## Errors

Every error is `{ code, message }` (`ApiError` in `shared/common.ts`). The
website shows its own wording for each `code` (`web/src/core/api.ts`); `message`
is for developers.

| Code | Status | When |
| --- | --- | --- |
| `INVALID_REQUEST` | 400 | The input broke a rule (`message` names the field), or a picked id doesn't exist or doesn't fit (a room from another shul) |
| `DATE_PASSED` | 400 | A featured shiur's date and time are already over |
| `BAD_REQUEST` | 400 | Any other 400 thrown without a code |
| `NOT_SIGNED_IN` | 401 | The route needs an account and there isn't one |
| `NO_PERMISSION` | 403 | Signed in, but not allowed (not used yet) |
| `SHUL_NOT_FOUND` | 404 | No such shul, or not approved |
| `SHIUR_NOT_FOUND` | 404 | No such shiur date, or not approved |
| `PUBLISHER_NOT_FOUND` | 404 | No such shul or maggid shiur, or not approved |
| `NOT_FOUND` | 404 | Any other 404, e.g. a route that doesn't exist |
| `TOO_MANY_REQUESTS` | 429 | Too many requests (nothing sends it yet) |
| `INTERNAL_ERROR` | 500 | A bug on our side. Logged with its stack trace |

To add one, throw a Nest exception with a `code`, e.g.
`new NotFoundException({ code: 'SHUL_NOT_FOUND', message })`, and add its
wording to `web/src/core/api.ts`.

## Outside services

| Service | Used for | Setting in `.env` | Without it |
| --- | --- | --- | --- |
| Google Maps JavaScript API | The map and its pins | `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID` | The map is grey; search and lists still work. A made-up Map ID loads the map with no pins |
| Google Places API | The address search on the map and for a new shul in the portal | `VITE_GOOGLE_MAPS_BROWSER_KEY` | No address suggestions, so no new shuls |
| Google Geocoding API | Nothing yet | `GOOGLE_MAPS_SERVER_KEY` | Nothing breaks |
| Google Maps directions link | The Directions buttons | none (a plain link) | Only that button |
| Google Calendar link and .ics file | Add to Calendar on the shiur page (FR-13) | none (a link, and a file the website builds) | Only those buttons |
| Better Auth | Accounts and sign-in, inside our own server | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN` | The real server won't start without the secret |
| Google sign-in | "Continue with Google" on the sign-in and sign-up pages (FR-2). Google Cloud project `shiurfinder-515904`, owned by Oriel | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The button says it isn't available; email sign-in still works. While Google's app is in testing, only its test users (up to 100, added on the project's Audience page) can sign in. Publishing needs a hosted site with privacy and terms pages |
| AWS RDS (PostgreSQL + PostGIS) | The shared database | `DATABASE_URL`, plus your IP on its firewall | The app hangs with no error |

The Hebrew date uses Node's built-in `Intl`, so it needs no service.

**Planned** in the design doc ("Build or buy"), not built yet:

| Service             | Will be used for                                         |
| ------------------- | -------------------------------------------------------- |
| Amazon SES          | Account emails: verification, password reset, approvals. Until then, the server prints them in its console (`core/auth/auth.email.ts`) |
| AWS SNS             | Alert and reminder emails                                |
| web-push            | Browser notifications                                    |
| Google Routes API   | Walking and driving times                                |
| Amazon S3           | Flyers, shul logos and maggid shiur photos               |
| Render              | Hosting the website and server, kept awake by an uptime monitor |
| Sentry              | Reporting server errors to the team                      |

Every service must stay in a free tier, and the app must keep working if one
fails (SRS 4.3). Move each one up to the table above when it's built.
