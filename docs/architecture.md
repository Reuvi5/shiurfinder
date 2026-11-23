# How the code fits together

Read this before adding a feature. For setup and commands, see the [README](../README.md).

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

Each feature folder (`map/`, `shiur-page/` and `publishers/` today) has the same files:

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

- `database/`: the one Prisma connection.
- `errors/`: every error the server sends is `{ code, message }`. Throw a Nest
  exception with a `code` (e.g. `new NotFoundException({ code: 'SHUL_NOT_FOUND', message })`)
  and the filter does the rest.
- `validation/`: `ZodValidationPipe`, which runs a schema on a request.

## Website: one folder per feature

`web/src/features/map/` holds everything for the map screen: components, hooks
and helpers, including `map.api.ts`, its calls to the server. Only things used by
several features live outside it:

- `core/api.ts`: `get()` for sending a request, and the error messages users see.
- `core/config.ts`: values from `.env`.
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
popup. `MapScreen` only holds which shiur is open; the card fetches its own
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

`map.queries.ts` has this as `STARTS_AT_NY`; use it. The one-step version
(`o."startsAt" AT TIME ZONE 'America/New_York'`) looks right but shifts every
time the wrong way, so a 10am shiur shows up in the afternoon.

**The pins and the list share one WHERE.** `searchFilters()` in `map.queries.ts`
is used by both queries. If they drifted apart you'd see a pin with nothing
behind it. To add a filter, add one line there.

**Typo-tolerant search.** The search box uses `similarity()` from the `pg_trgm`
extension, so "gemora" still finds "Gemara".

**Tables not used yet.** `schema.prisma` already has the tables for accounts,
follows, saves, reports and alerts from the design document. Only Publisher,
Room, Shiur, Occurrence, Topic, Language and Audience are used so far.

## Privacy rules the code follows

- The user's location is only sent as part of a search and is never saved (NFR-5).
- An unapproved shul returns the same "not found" as a missing one, so nobody
  can see it exists before a moderator approves it (NFR-4). The shul and maggid
  shiur pages do the same, and also hide shiurim at unapproved shuls and the
  names of unapproved maggidei shiur.
- Anything in a `VITE_` variable ends up in the public JavaScript. No secrets there.
