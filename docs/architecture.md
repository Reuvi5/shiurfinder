# How the code fits together

Read this before adding a feature. For setup and commands, see the [README](../README.md).

## Where things are

Every folder, plus the files that are one of a kind. A feature's usual files
(controller, service, queries, ...) follow `map/`'s pattern, so they're only
listed there. Every file also starts with a line saying what it does.

```
server/                    The API (NestJS). Runs on http://localhost:3000
  prisma/                    schema.prisma (the tables), migrations/, seed.ts (demo data)
  scripts/                   guard-local-db.js: stops commands that could wipe the shared database
  src/
    main.ts                  starts the server
    app.setup.ts             settings both the real server and the test server get
    app.module.ts            the list of features the server is made of
    features/                one folder per feature (anything with routes)
      map/                     the map (FR-5): the pattern every feature copies
        map.controller.ts        routes: /map/search, /map/filters, /map/shul/:id/today
        map.validation.ts        what a request is allowed to contain
        map.service.ts           the logic: turns rows into what the website shows
        map.queries.ts           the SQL
        map.constants.ts         fixed numbers (radius, 7-day window, ...)
        map.module.ts            tells NestJS which files belong to the feature
      shiur-page/              one date of a shiur (FR-9): /shiur-page/:occurrenceId
      publishers/              shul and maggid shiur pages (FR-10): /publishers/:id
      portal/                  posting a shiur (FR-20): /portal/options, POST /portal/shiurim
      health/                  /health: is the server up, can it reach the database
    core/                    code every feature uses
      auth/                    login (Better Auth): /auth/..., SignedInGuard, @CurrentUser()
      config/                  which website addresses may call the server
      database/                the one Prisma connection; test-db.setup.ts readies the test database
      errors/                  error.filter.ts: turns every error into { code, message }
      testing/                 test-app.ts (the whole server for API tests), test-data.ts (test rows)
      time/                    ny-time.ts: New York time to UTC (nyTimeToUtc)
      validation/              zod-validation.pipe.ts: checks requests against a Zod schema

web/                       The website (React + Vite). Runs on http://localhost:5173
  src/
    main.tsx                 starts the website
    App.tsx                  loads Google Maps and the router
    routes.tsx               which page each web address shows
    core/                    code every feature uses
      api.ts                   get() and post() to the server; the error messages users see
      auth.ts                  who is signed in (useCurrentUser); sign up, in and out
      config.ts                settings from .env (server URL, Maps key, Map ID)
    components/              pieces several features use
      ShiurRow.tsx             one shiur in a list
      MapPopup.tsx             a popup below or above a map pin
    features/
      map/                   the map screen
        MapScreen.tsx          the screen; runs the one search both halves use
        SidePanel.tsx          left half: search, filters, Weekly and Featured lists
        MapView.tsx            right half: the Google map and pins
        ShulCard.tsx           the popup when a pin is clicked
        map.search.ts          what the web address remembers (?shul=&shiur=)
        map.api.ts             the map's calls to the server
        ...                    smaller pieces, hooks, helpers
      shiur-page/            one date of a shiur (FR-9)
        ShiurCard.tsx          the popup on the map, at the shiur's building
        ShiurPage.tsx          the same details at /shiur/:id (where Share links go)
        ShiurInfo.tsx          the details and buttons both of them show
        shiur-page.format.ts   dates, badges, and the calendar and directions links
      publisher-page/        shul page (/shul/:id) and maggid shiur page (/maggid/:id)
      publisher-portal/      the "Post a shiur" form at /portal (FR-20)
        Combobox.tsx           a list you can pick from or type a new name in

shared/                    the types the server and website send each other
  common.ts                  types several features use, and the error shape
  index.ts                   lists every file here
  <feature>.ts               one file per feature, e.g. map.ts

docs/                      SRS, design doc, architecture, API, progress
```

## The big picture

```
Browser (web/)                         Server (server/)                    Database (AWS RDS)
───────────────                        ────────────────                    ──────────────────
MapScreen                              MapController   receives & checks
  └ useMapSearch ─ map.api.ts ─ HTTP ─▶ └ MapService  decides
                                             └ MapQueries  SQL ──────────▶  Postgres + PostGIS
         ◀──────────── JSON ({ pins, weekly, featured, ... }) ──────────────
```

The shapes of that JSON live in `shared/`, one file per feature (e.g. `shared/map.ts`).
Both sides import them, so if one side changes a shape, the other side fails to
compile instead of breaking at runtime.

## Server: one folder per feature, three layers per folder

Each feature folder (`map/`, `shiur-page/`, `publishers/` and `portal/` today) has the same files:

| File                 | Its job                                                         | Should never     |
| -------------------- | --------------------------------------------------------------- | ---------------- |
| `*.controller.ts`    | Define the routes. Check input, call the service, return.       | contain logic    |
| `*.validation.ts`    | Zod schemas: what a request may contain.                        |                  |
| `*.service.ts`       | The logic: what the rows mean, what to return, what's an error. | contain SQL      |
| `*.queries.ts`       | Fetch from the database. Only this file uses `PrismaService`.   | contain logic    |
| `*.constants.ts`     | Fixed numbers.                                                  |                  |
| `*.module.ts`        | Tells NestJS which files belong to the feature.                 |                  |

To add a feature, copy that layout, then add the new module to `imports` in
`server/src/app.module.ts`.

`server/src/core/` holds what every feature uses:

- `auth/`: login, through Better Auth (see "Login" below).
- `config/`: settings several parts read, like which website may call us.
- `database/`: the one Prisma connection.
- `errors/`: every error the server sends is `{ code, message }`. Throw a Nest
  exception with a `code` (e.g. `new NotFoundException({ code: 'SHUL_NOT_FOUND', message })`)
  and the filter does the rest.
- `validation/`: `ZodValidationPipe`, which runs a schema on a request.

## Website: one folder per feature

`web/src/features/map/` holds everything for the map screen: components, hooks
and helpers, including `map.api.ts`, its calls to the server. Only things used by
several features live outside it:

- `core/api.ts`: `get()` and `post()` for sending a request, and the error messages users see.
- `core/config.ts`: values from `.env`, including the Map ID. Pins and popups are
  Advanced Markers, which only draw on a map with a real Map ID, so every `<Map>`
  passes `mapId={MAP_ID}`.
- `routes.tsx`: which page each web address shows.
- `App.tsx`: loads Google Maps and the router.

When a component is needed by two features (a generic button, say), move it to
`web/src/components/`. Today that's `ShiurRow`: one shiur in a list, used by the
map and the shul, maggid shiur and shiur pages. Clicking it opens the shiur page.

**One search feeds the whole map screen.** `MapScreen` runs `useMapSearch` once
and passes the results to both `SidePanel` and `MapView`, so the pins and the list
can't disagree. The only other search is FilterPanel's "Show N shiurim" preview,
which shares the same cache.

**The shiur popup (FR-9).** Clicking a shiur, in the side panel or in a shul's
card on the map, opens `ShiurCard` (from `features/shiur-page/`) just below the
shiur's building. It takes the shul card's place, so there's only ever one
popup. Which pin and shiur are open is kept in the web address
(`/?shul=…&shiur=…`, see `features/map/map.search.ts`), so every click is a step
in the browser's history and Back goes back through them. The card fetches its own
details from `/shiur-page/:occurrenceId`. The same details also have their own
page at `/shiur/:id`, which is the link Share sends. That page adds a small map
of the building, and shows distance only if the user already allowed location
(it never shows the browser's location prompt to someone opening a shared link). The side panel follows
the map: it rings the open shiur's row, or with no shiur open, every row of the
clicked pin's shul. It switches tabs if needed and scrolls to the first ringed
row. Each tab remembers its own scroll position for when the user switches back. The Hebrew date is worked
out on the server with Node's built-in `Intl` Hebrew calendar, so there's no
extra package.

**Map popups open below or above their pin.** Both the shul card and the shiur
popup use `components/MapPopup.tsx`, because Google's InfoWindow can only open
above its point. The shul card always opens below. The shiur popup opens on
the side away from the user's dot (above when the user is south of the shul),
so it never covers it. The popup stops scrolls and drags inside it from
reaching the map.

**The map is moved, not held.** `MapView` gives the map only a `defaultCenter`.
Passing `center` would make it jump back to the search point on every
re-render, so it could never move to a clicked shiur or stay where the user
dragged it. Instead:

- `MoveMap` pans to the search point when it changes.
- `FocusMap` runs when a popup opens. For a shiur, it fits the user's blue dot
  and the shul in view (no closer than street level) so the user sees how far
  it is. With location off, there's no dot, so it just zooms to the shul. For
  a shul pin, it only pans enough to fit the card.

**Posting a shiur (FR-20).** `/portal` shows `ShiurForm`. `GET /portal/options`
fills its lists, and `POST /portal/shiurim` saves. The shul, maggid shiur, room,
topic and language are `Combobox`es: pick from the list or type a new name. Each is
sent as `{ id }` or `{ name }` (`PickOrNew` in `shared/portal.ts`). A typed name that
matches an existing one, ignoring capitals, reuses it, so "gemara" doesn't add a
second Gemara. Shuls are the exception, since two towns can each have a Beth Israel.
A new shul also needs its address, picked with the map's `LocationSearch`, which
gives it a point on the map.

The server checks that picked ids exist and fit together (a picked room must be the
shul's own). It then saves everything in one transaction: any new shul, maggid shiur,
room, topic or language, then the shiur and its dates. A featured shiur gets one
date; a weekly one gets 8 weeks of dates (the nightly job in the design doc will keep
them topped up). The map reads the same tables, so the shiur is on it as soon as the
request returns. The form then clears TanStack Query's cache so the map doesn't show
old results. There's no sign-in yet, so new shuls and maggidei shiur are approved
straight away. Once accounts are built, only the shul's team may post for it, and new
ones wait for a moderator (NFR-4).

## Login (FR-2)

Login is Better Auth, running inside our server (`server/src/core/auth/`).
It answers everything under `/auth/` itself: `POST /auth/sign-up/email`,
`/auth/sign-in/email`, `/auth/sign-out`, `GET /auth/get-session` and the rest
([its list](https://www.better-auth.com/docs/concepts/api)). `app.setup.ts` hands
those requests to it before NestJS reads the body, because Better Auth reads the
body itself. It keeps users, sessions and password hashes in the `User`,
`Session` and `Account` tables.

The login is an HttpOnly cookie that page scripts can't read, so a script on the
page can't steal it. A browser on another website can't use it either: Better
Auth refuses any login request whose `Origin` isn't one of ours (`WEB_ORIGIN`).

**A route that needs an account:**

```ts
@Post(':id/save')
@UseGuards(SignedInGuard)
save(@CurrentUser() user: SignedInUser) { ... }   // user = { id, isModerator }
```

A guest gets `401 NOT_SIGNED_IN`, which the website shows as "Sign in to do that."
The guard only checks that *someone* is signed in. Whether *this* person may change
*this* shul's shiurim is up to the feature's service (NFR-4).

**On the website**, `core/auth.ts` has `useCurrentUser()` (who is signed in, or
null) and `authClient` (`authClient.signIn.email(...)`, `authClient.signOut()`).

**In API tests**, `signUp(app, data)` from `core/testing/test-app.ts` makes a
user and returns the `Cookie` to send as them. SQL tests that just need a user
row use `data.user()`.

**Not built yet:** verification and password reset emails, Google sign-in, and
the sign-in pages.

## Database notes

**Why raw SQL.** A shul's location is a PostGIS `geography(Point, 4326)` column.
Prisma has no type for it, so `schema.prisma` declares it `Unsupported(...)`.
Prisma still creates and migrates the column but can't read or filter it, so
every distance query is raw SQL in `map.queries.ts`. Simple lookups (like
`findApprovedShul`) still use the normal Prisma client.

**Longitude comes first.** `ST_MakePoint(lng, lat)`, not `(lat, lng)`. Getting this
backwards puts Teaneck in the Indian Ocean and the query silently returns nothing.

**Times are stored UTC, shown in New York time.** `Occurrence.startsAt` is UTC in
a `TIMESTAMP` column *without* a time zone. To filter by New York day or time, convert in two steps:

```sql
(o."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York'
```

`map.queries.ts` has this as `STARTS_AT_NY`; use it. Going the other way (a New York
date and time the user typed, to UTC), `portal.queries.ts` has `nyMoment()`. The one-step version
(`o."startsAt" AT TIME ZONE 'America/New_York'`) looks right but shifts every
time the wrong way, so a 10am shiur shows up in the afternoon.

**The pins and the list share one WHERE.** `searchFilters()` in `map.queries.ts`
is used by both queries. If they drifted apart you'd see a pin with nothing
behind it. To add a filter, add one line there.

**Typo-tolerant search.** The search box uses `similarity()` from the `pg_trgm`
extension, so "gemora" still finds "Gemara".

**Tables not used yet.** `schema.prisma` already has the tables for follows,
saves, reports and alerts from the design document. Used so far: Publisher,
Room, Shiur, Occurrence, Topic, Language and Audience, and for login User,
Session, Account and Verification.

## Privacy rules the code follows

- The user's location is only sent as part of a search and is never saved (NFR-5).
- An unapproved shul returns the same "not found" as a missing one, so nobody
  can see it exists before a moderator approves it (NFR-4). The shul and maggid
  shiur pages do the same, and also hide shiurim at unapproved shuls and the
  names of unapproved maggidei shiur. The map and the shiur page hide those
  names too, and the search box can't find them.
- Anything in a `VITE_` variable ends up in the public JavaScript. No secrets there.
- Passwords are stored only as hashes (in `Account.password`). Nobody can make
  themselves a moderator at sign-up: `isModerator` is set by us, in the database.

## Tests

- **Unit tests** go in a `tests/` folder beside the code they test
  (`features/map/tests/filters.test.ts` tests `features/map/filters.ts`) and
  never touch a database: a service is tested with a fake `*.queries.ts`, so
  its logic is checked without SQL.
- **SQL tests** (`*.db.test.ts`) test the `*.queries.ts` files on a real
  Postgres + PostGIS database, because the filters (distance, New York day and
  time, approved only) live in the SQL. `server/src/core/database/test-db.setup.ts`
  checks the database is local and brings its tables up to date first.
  `TestData` in `server/src/core/testing/test-data.ts` makes the rows and
  removes them after. Each test file puts its shuls at its own `testPlace`, far
  from the others, so one file's search never finds another file's rows.
- **API tests** (also `*.db.test.ts`) send real requests to the whole server
  with `supertest`, to check the parts work together: validation, service, SQL
  and the `{ code, message }` errors. `startTestApp()` in
  `server/src/core/testing/test-app.ts` starts the server with the same
  settings as `main.ts` (both use `app.setup.ts`).
- Everything runs in UTC (`vitest.config.ts`), so a time shown in the computer's
  own time zone instead of New York fails a test.

How to run them: README, "Tests". Rules: CLAUDE.md, "Tests".
