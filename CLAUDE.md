# ShiurFinder: team rules

NestJS server (`server/`), React + Vite website (`web/`), shared types
(`shared/`), PostgreSQL + PostGIS through Prisma. How the code fits together:
`docs/architecture.md`. Routes and outside services: `docs/api.md`. What's
built and what's left: `docs/progress.md`.

The design doc (`docs/ShiurFinder_Software_Design_Document.pdf`) wins over the
SRS (`docs/Software_Requirements_Specification_SRS.pdf`) and over the code. If
code disagrees with the design doc, say so before changing it.

## Ask first

Ask before anything that's hard to undo or affects other people's work, for
example: changing the database (tables or shared data), adding an npm package,
editing another feature's folder or a setup file (`.github/`, `.husky/`,
config files), or going against the design doc. If the SRS and design doc
don't say how something should work, ask instead of guessing.

## Commands

- `npm run dev`: starts the server and the website.
- Before a PR: `npm run typecheck` and `npm test`. GitHub also checks format,
  build and test coverage (limit in `vitest.config.ts`), and runs the SQL tests.
- Git hooks do the rest: they format every commit, and run `npm install` after
  a pull that changed `package-lock.json`.

## Avoiding clashes

- Stay in your own feature's folders:
  - `server/src/features/<feature>/`
  - `web/src/features/<feature>/` (its server calls go in `<feature>.api.ts`)
  - `shared/<feature>.ts` for its types
- Shared files (`shared/index.ts`, `routes.tsx`, `app.module.ts`, ...): add
  your own line; don't change anyone else's unless you have to, and then say
  so in the PR.
- Schema changes (`schema.prisma`, migrations) and new npm packages always go
  in their own small PR first, by one person. Two people changing either at
  once can break things for everyone.

## Code

- Names: components `PascalCase.tsx`, other files `feature.part.ts`
  (`shiurim.service.ts`), folders `kebab-case`.
- Tests go in a `tests/` folder beside the code they test:
  `features/map/tests/filters.test.ts` tests `features/map/filters.ts`.
- Times: the database stores UTC. Users always see and enter New York time,
  wherever they are. Server: use `STARTS_AT_NY` (map.queries.ts), `nyMoment`
  (portal.queries.ts) and `nyTimeToUtc` (core/time/ny-time.ts). Website:
  format with `timeZone: 'America/New_York'`. Never do your own offset math.
- Routes that need an account: `@UseGuards(SignedInGuard)` and
  `@CurrentUser()` from `core/auth/`. Never read the cookie yourself. Who may
  change what (a shul's own team, a moderator) is checked in the service.
- Comments: match the style already in the code (see `features/map/`).
  Short, simple words:
  - Top of every file: one line on what it does. Then, if useful, how it fits
    with other files, what doesn't belong in it, or a short example.
  - Functions and types: a `/** */`, one line unless it's tricky; then say
    what would go wrong (e.g. "a 10am shiur shows up at 3pm").
  - Inside code: why, when it isn't obvious.
  - Point to other files or docs, and mention the requirement (FR-5, NFR-4)
    when it relates to one.
  - Long files: split into sections with `// ------------- name` lines.
  - No commented-out code.

## Database

- `DATABASE_URL` usually points at the shared AWS database. Never run
  `db:migrate` or `db:reset` on it: they can wipe it. Ask before `db:deploy`
  or deleting data there.
- Use the `npm run db:*` commands, never `npx prisma`: it skips the safety
  check.
- Data you add by hand to the shared database: titles start with `TEST`.

## Tests

How to run them and how they're set up: README, "Tests".

- Code that decides or calculates gets tests in the same PR: formatting,
  validation, services, time helpers, and SQL that filters or sorts. "It's
  too simple to break" isn't a reason to skip one.
- Each FR you build gets at least one test for its Process and Output in the
  SRS. Put the FR in the name: `describe('FR-5 map search', ...)`.
- Every feature that shows shuls, maggidei shiurim or shiurim has a test that
  nothing from an unapproved publisher shows up (NFR-4). Once logins exist,
  every change also tests that the wrong role is refused.
- Test the edges, not just the normal case: limits (59 vs. 61 minutes), empty,
  missing, bad input, the day the clocks change.
- Test what code returns or does, not how: no checking internal calls, no
  snapshots of SQL or components.
- Every test has a check that would fail if the code broke, and works alone:
  its own data, any order, no real network, the time set in the test (tests
  run with `TZ=UTC`).
- SQL tests (`npm run test:db`) use the local Docker database, never the
  shared one, and clean up after themselves. No Docker? GitHub runs them on
  your PR.
- Bug fix: add a test that fails without the fix. Never change a test just to
  make it pass; if the behavior is meant to change, say so in the PR.

## Commits and PRs

- Short and simple, only what's needed.
- Every PR updates the docs its change affects (README, `docs/architecture.md`,
  `docs/api.md`, `docs/progress.md`, CLAUDE.md).
- No AI attribution lines (no "Generated with Claude Code", no Co-Authored-By).
- If a PR's steps include `npm install`, add: "If it fails with
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (network/antivirus filter), run
  `NODE_OPTIONS=--use-system-ca npm install`."
