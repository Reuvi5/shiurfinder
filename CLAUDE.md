# ShiurFinder: team rules

NestJS server (`server/`), React + Vite website (`web/`), shared types
(`shared/`), PostgreSQL + PostGIS through Prisma. What each file does:
`docs/architecture.md`.

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
- Before a PR: `npm run typecheck`. GitHub also checks format and build.
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
- Times: the database stores UTC. Users always see and enter New York time,
  wherever they are. Server: use `STARTS_AT_NY` (map.queries.ts), `nyMoment`
  (portal.queries.ts) and `nyTimeToUtc` (seed.ts). Website: format with
  `timeZone: 'America/New_York'`. Never do your own offset math.
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

## Commits and PRs

- Short and simple, only what's needed.
- Every PR updates the docs its change affects (README, `docs/architecture.md`,
  CLAUDE.md).
- No AI attribution lines (no "Generated with Claude Code", no Co-Authored-By).
- If a PR's steps include `npm install`, add: "If it fails with
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (network/antivirus filter), run
  `NODE_OPTIONS=--use-system-ca npm install`."
