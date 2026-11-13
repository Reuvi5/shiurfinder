# ShiurFinder

Live shiurim on a map. Anyone can find a shiur near them at a time they are free;
shuls and maggidei shiur get one place to post and update their schedules.

**MCON 357** — Oriel Zer, Reuvi Kupchik, Mattan Jackier

---

## What's built

**Tracer Bullet FR-5 — Find a shiur on the map (UC-1).** The map home screen,
end to end: React website → NestJS server → PostGIS distance query → pins and
the Featured/Weekly lists.

Still to come: FR-20 (create a shiur), accounts, follows, notifications,
moderation.

## Stack

| Part      | What we use                                           |
| --------- | ----------------------------------------------------- |
| Website   | React 18, TypeScript, Vite, TanStack Query, Tailwind  |
| Map       | Google Maps Platform via `@vis.gl/react-google-maps`  |
| Server    | NestJS, Zod                                            |
| Database  | PostgreSQL 16 + PostGIS + pg_trgm (AWS RDS)           |
| ORM       | Prisma — plus raw SQL for the distance queries         |

## Layout

```
apps/
  server/          NestJS. One module per area of the app.
    prisma/        schema.prisma, migrations, seed.ts
    src/
      map/         Search and Map — Tracer Bullet FR-5
      prisma/      the only thing that opens a DB connection
      common/      error filter, Zod pipe
  web/             React website
    src/
      api/         the one place that calls the server
      components/  MapView, SidePanel, ShiurRow
      hooks/       useMapSearch, useSearchLocation
packages/
  shared/          Types both sides import, so the API contract can't drift
```

## Getting started

You need **Node 20+**, **Docker Desktop**, and a **Google Maps API key**.

```bash
git clone https://github.com/Reuvi5/shiurfinder.git
cd shiurfinder
npm install

cp .env.example .env     # then fill in your Google Maps keys
npm run db:up            # Postgres + PostGIS in Docker
npm run db:migrate       # create the tables
npm run db:seed          # 7 shuls around Teaneck with real-ish schedules
npm run dev              # server :3000, website :5173
```

Open http://localhost:5173.

### Google Maps keys

Two keys, from the [Google Cloud console](https://console.cloud.google.com/google/maps-apis):

- `VITE_GOOGLE_MAPS_BROWSER_KEY` — enable **Maps JavaScript API** and **Places
  API**. Restrict it by HTTP referrer (`localhost:5173`). This one ships to the
  browser, so it is public by design — the referrer restriction is what protects it.
- `GOOGLE_MAPS_SERVER_KEY` — enable **Geocoding API**. Restrict by IP. Server
  only, never in a `VITE_` variable.

### A note on `prisma generate`

Prisma downloads its query engine from `binaries.prisma.sh` on first run. If you
are working through a restricted network you will see a 403 there — run it from
a normal connection and the downloaded engine is cached afterwards.

```bash
npm run prisma:generate --workspace @shiurfinder/server
```

Do this once after cloning, before `npm run db:migrate`.

### Checking it works

```bash
curl "http://localhost:3000/health"
curl "http://localhost:3000/map/search?lat=40.8976&lng=-74.0204&radiusMiles=5"
```

`/health` reports the PostGIS version, which is the quickest way to tell whether
the extension actually loaded.

## Database notes

**PostGIS and Prisma.** Prisma has no geography type, so `Publisher.location` is
declared `Unsupported("geography(Point, 4326)")`. Prisma creates and migrates
the column but can't read or filter it, so every distance query is raw SQL in
`map.repository.ts`. This is deliberate — see "Distance search" in the design doc.

**Longitude comes first.** `ST_MakePoint(lng, lat)`, not `(lat, lng)`. Getting
this backwards puts Teaneck in the Indian Ocean and the query silently returns
nothing.

**Times are stored UTC, displayed New York.** `Occurrence.startsAt` is UTC. Any
query that filters on day-of-week or time-of-day converts first:
`o."startsAt" AT TIME ZONE 'America/New_York'`.

## How we work

`main` is the integration branch. Nothing gets pushed to it directly.

```bash
git checkout -b feat/fr5-map-search    # one branch per requirement
git commit -m "feat(map): radius search via PostGIS"
git push -u origin feat/fr5-map-search
# open a PR, one of the other two reviews it, then squash and merge
```

Branch names: `feat/fr<N>-<short-name>`, `fix/<short-name>`, `chore/<short-name>`.

Commit messages: `type(scope): what changed` — `feat`, `fix`, `refactor`,
`chore`, `docs`. The log doubles as a changelog when we demo.

**Everyone commits their own work under their own name.** The Nov 30 demo is
partly graded on Git history showing all three of us.

## Design principles

The server is layered: **controller** (receives) → **service** (decides) →
**repository** (stores). A controller holds no rules; a service holds no SQL.

`MapService` depends on `MapRepositoryPort`, not on a concrete class, so the
rules can be tested with a fake and the storage can change underneath.

Filters compose. Each one (`topicClause`, `dayClause`, `textClause`) is its own
method assembled by `baseWhere`, so adding a filter means adding a method rather
than editing one long `WHERE`.

Pins and lists share `baseWhere` on purpose. If they drifted you'd get a pin on
the map with nothing behind it.

## Documents

The SRS and the Software Design Document are in `docs/`. When code and the
design doc disagree, the **design doc wins** — update the code, or update the
doc deliberately.
