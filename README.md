# ShiurFinder

Live shiurim on a map. Anyone can find a shiur near them at a time they are free;
shuls and maggidei shiur get one place to post and update their schedules.

**MCON 357** — Oriel Zer, Reuvi Kupchik, Mattan Jackier

**Built so far:** the map home screen (FR-5, UC-1): search by location, distance,
text and filters; pins on a map; Weekly and Featured lists; a card for each shul.
The shiur popup and page (FR-9): click any shiur for its full details, Hebrew
date, and Add to Google Calendar, Directions and Share buttons. The browser's
Back button goes back through the pins and shiurim you opened.
Shul and maggid shiur pages (FR-10). Posting a shiur at `/portal` (FR-20): a form
for a weekly or one-time shiur that shows up on the map right away. The shul, maggid
shiur, room, topic and language can be picked from a list or typed in new; a new shul's
address is picked from Google's suggestions so it gets a pin.
The base for login (FR-2): sign-up and sign-in by email and password, and a check
that routes use to refuse guests. No sign-in pages yet.
**Next:** sign-in pages and account settings, saves and follows, changing and
cancelling shiurim, then notifications and moderation.

---

## Folders

```
server/                  The API (NestJS). Runs on http://localhost:3000
  prisma/                  schema.prisma (the tables), migrations/, seed.ts (demo data)
  scripts/                 guard-local-db.js (stops commands that could wipe the shared DB)
  src/
    main.ts                starts the server
    app.module.ts          the list of features the server is made of
    features/              one folder per feature (anything with routes)
      map/                   the map feature
        map.controller.ts      routes: /map/search, /map/filters, /map/shul/:id/today
        map.validation.ts      what a request is allowed to contain
        map.service.ts         the logic: turns rows into what the website shows
        map.queries.ts         the SQL
        map.constants.ts       fixed numbers (radius, 7-day window, ...)
      shiur-page/            the shiur popup and page (FR-9): /shiur-page/:occurrenceId
      publishers/            shul and maggid shiur pages; route: /publishers/:id
      portal/                posting a shiur (FR-20): /portal/options, POST /portal/shiurim
      health/                /health: is the server up, can it reach the database
    core/                  code every feature uses
      auth/                  login (Better Auth): /auth/..., SignedInGuard, @CurrentUser()
      config/                settings several parts read (which website may call us)
      database/              the database connection (Prisma)
      errors/                turns every error into { code, message }
      validation/            checks requests against a Zod schema

web/                     The website (React + Vite). Runs on http://localhost:5173
  src/
    main.tsx               starts the website
    App.tsx                loads Google Maps and the router
    routes.tsx             which page each web address shows
    core/                  code every feature uses
      api.ts                 sends requests to the server (get, post); error messages
      auth.ts                who is signed in (useCurrentUser); sign up, in and out
      config.ts              settings from .env (server URL, Maps key, Map ID)
    components/            pieces several features use (ShiurRow: one shiur in a list;
                             MapPopup: a popup next to a map pin)
    features/
      map/                 everything for the map screen
        MapScreen.tsx        the screen; holds the search state
        SidePanel.tsx        left half: search, filters, lists
        MapView.tsx          right half: the Google map and pins
        ShulCard.tsx         the popup when a pin is clicked
        map.api.ts           the map's calls to the server
        map.search.ts        what the web address remembers (?shul=&shiur=)
        ...                  smaller pieces, hooks, helpers
      shiur-page/          one date of a shiur (FR-9)
        ShiurCard.tsx        the popup on the map, at the shiur's building
        ShiurPage.tsx        the same details at /shiur/:id (where Share links go), with a small map
        ShiurInfo.tsx        the details and buttons both of them show
      publisher-page/      shul page (/shul/:id) and maggid shiur page (/maggid/:id)
      publisher-portal/    the "Post a shiur" form at /portal (FR-20); Combobox: pick or type

shared/                  the shapes the server and website send each other
  common.ts                types several features use
  map.ts                   the map's types (one file per feature)
  shiur-page.ts            the shiur popup's types
  publishers.ts            the shul and maggid shiur pages' types
  portal.ts                the "Post a shiur" form's types
  index.ts                 lists every file above

docs/                    SRS, design document, architecture notes
```

**Adding a feature?** Make a folder for it on both sides, e.g. `server/src/features/shiurim/`
and `web/src/features/create-shiur/`, and copy the layout of `map/`. Then add the
module to `server/src/app.module.ts`, the page to `web/src/routes.tsx`, and your
types file to `shared/index.ts`.
[docs/architecture.md](docs/architecture.md) explains how the pieces fit.

## Stack

| Part     | What we use                                                |
| -------- | ---------------------------------------------------------- |
| Website  | React 18, TypeScript, Vite, TanStack Query, Tailwind        |
| Map      | Google Maps Platform via `@vis.gl/react-google-maps`        |
| Server   | NestJS, Zod                                                 |
| Database | PostgreSQL 16 + PostGIS + pg_trgm, hosted on AWS RDS        |
| ORM      | Prisma for the tables and migrations; raw SQL for distance  |

---

## Getting started

You need **Node 20.19 or newer** (`node --version`). Older versions can't load
Better Auth, the login package. Get it from https://nodejs.org.
On a Mac, `brew install node` also works. After installing, close and reopen your terminal.

```bash
git clone https://github.com/Reuvi5/shiurfinder.git
cd shiurfinder
npm install              # also generates the Prisma client
cp .env.example .env
```

Open `.env` and fill in:

1. **`DATABASE_URL`**: use the shared AWS line. Ask Reuvi for the password.
   Your IP address also has to be allowed through the AWS firewall: run
   `curl -4 ifconfig.me` and send Reuvi the number.
2. **The Google Maps keys** (see below). Optional: without them the map is
   grey, but search, lists and filters still work.
3. **`BETTER_AUTH_SECRET`**: any long random text, for login cookies. Make one
   with `node -e "console.log(crypto.randomUUID())"`. Optional on your own
   computer, required on the real server.

Then:

```bash
npm run dev              # server on :3000, website on :5173
```

Open http://localhost:5173.

### Checking it works

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/map/search?lat=40.8976&lng=-74.0204&radiusMiles=5"
```

`/health` should say `"db":"up"` and show a PostGIS version.

### Google Maps keys

Two keys, from the [Google Cloud console](https://console.cloud.google.com/google/maps-apis):

- `VITE_GOOGLE_MAPS_BROWSER_KEY`: enable **Maps JavaScript API** and **Places API**,
  and restrict it to the website `localhost:5173`. This one is sent to the browser,
  so it's public; the restriction is what protects it.
- `VITE_GOOGLE_MAPS_MAP_ID`: the Map ID, already filled in `.env.example`. The pins
  and popups need a real one: with a made-up ID the map loads but every pin is missing.
- `GOOGLE_MAPS_SERVER_KEY`: enable **Geocoding API** and restrict it by IP.
  Server only. Never put it in a `VITE_` variable.

---

## Commands

Run all of these from the repo root.

| Command              | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Run the server and website, reloading on every save           |
| `npm run typecheck`  | Check the TypeScript in all three folders                     |
| `npm run format`     | Tidy the code the same way for everyone (Prettier)            |
| `npm test`           | Run the unit tests (see "Tests" below)                        |
| `npm run test:db`    | Run the SQL tests. **Local Docker only**, see "Tests"         |
| `npm run build`      | Build the server and website for production                   |
| `npm run db:seed`    | Add the demo shuls and shiurim (safe to run twice)            |
| `npm run db:studio`  | Browse the database in your browser                           |
| `npm run db:deploy`  | Apply migrations that already exist. Safe on the shared database |
| `npm run db:migrate` | Create a new migration. **Local Docker only**, see below      |
| `npm run db:reset`   | Wipe and rebuild the database. **Local Docker only**          |

## Tests

The tests use [Vitest](https://vitest.dev). The rules for writing them are in
[CLAUDE.md](CLAUDE.md), "Tests".

- **Unit tests** (`*.test.ts`, in a `tests/` folder beside the code they test): `npm test`. No database
  needed. Add `-- --watch` to rerun them on every save, or `-- --coverage` to see
  which lines they reach (GitHub fails a PR below the limit in `vitest.config.ts`).
  On Windows, run coverage in a terminal whose folder starts with a capital `C:`
  (VS Code's often starts with `c:`), or every file shows up twice.
- **SQL tests** (`*.db.test.ts`): `npm run test:db`. They need a real database, so
  they run on their own one in the local Docker container, never the shared one.
  First time only: `npm run db:up`, then
  `docker exec shiurfinder-db createdb -U shiurfinder shiurfinder_test`.
  `TEST_DATABASE_URL` in `.env` already points there.
- **No Docker?** GitHub runs both on every PR, so push and check there.

All tests run in UTC on purpose, so code that uses the computer's own time zone
instead of New York fails. The settings are in `vitest.config.ts`.

## Changing the database

Day to day everyone uses the shared AWS database, and **you don't need Docker**.

You only need a local database when you **change `schema.prisma`**.
`npm run db:migrate` compares the schema against a database it is allowed to wipe,
so it refuses to run against AWS. To change the schema:

1. Install Docker Desktop, then `npm run db:up` (starts Postgres + PostGIS locally).
2. In `.env`, switch `DATABASE_URL` to the localhost line.
3. Edit `server/prisma/schema.prisma`, then `npm run db:migrate`. This creates a
   new folder in `server/prisma/migrations/`. Commit it.
4. Switch `DATABASE_URL` back to AWS and run `npm run db:deploy` to apply it there.

**Never run `npx prisma migrate dev` directly.** That skips the safety check and
can delete everyone's data on the shared database.

## Things that will bite you

- **The app hangs with no error.** Your IP address probably changed (home connections
  do this). Run `curl -4 ifconfig.me` again and send Reuvi the new number.
- **`EADDRINUSE`.** Something is still running on port 3000 or 5173, often an old
  `npm run dev` in another terminal tab. Stop it with Ctrl+C.
- **`prisma generate` fails with a 403.** Prisma downloads an engine on first install;
  some networks block it. Run `npm install` once on a normal connection.
- **Never commit `.env`.** It holds the database password. `.gitignore` covers it.

## How we work

`main` is the integration branch. Nothing is pushed to it directly.

```bash
git checkout -b feat/fr20-create-shiur     # one branch per requirement
git commit -m "feat(shiurim): add create form"
git push -u origin feat/fr20-create-shiur
# open a PR; one of the other two reviews it; squash and merge
```

- Branch names: `feat/fr<N>-<short-name>`, `fix/<short-name>`, `chore/<short-name>`
- Commit messages: `type(scope): what changed`, where type is `feat`, `fix`, `refactor`, `chore` or `docs`
- **Everyone commits their own work under their own name.** The demo is partly
  graded on Git history showing all three of us.
- GitHub checks every PR (formatting, TypeScript, build, tests). A red X means one failed;
  `npm run format` fixes formatting.
- Two Git hooks run by themselves (`npm install` sets them up): before each commit,
  Prettier formats the files you're committing; after each `git pull`, `npm install`
  runs if the packages changed.
- Team rules for working without clashes are in [CLAUDE.md](CLAUDE.md). Claude Code
  reads it automatically.

## Documents

In [docs/](docs/): the SRS, the Software Design Document, the database diagram, and
[architecture.md](docs/architecture.md). The **design doc wins** over the SRS and over
the code: when they disagree, fix the code, or update the doc on purpose.
