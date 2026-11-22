# ShiurFinder: team rules

The design doc wins over the SRS and over the code.

## Avoiding clashes

- Stay in your own feature's folders:
  - `server/src/features/<feature>/`
  - `web/src/features/<feature>/` (its server calls go in `<feature>.api.ts`)
  - `shared/<feature>.ts` for its types
- Shared files (`shared/index.ts`, `routes.tsx`, `app.module.ts`, ...): add
  your own line, never change anyone else's.
- When work is split, database changes and new npm packages go in their own
  small PR first, by one person. Two people changing either at once can
  break things for everyone.

## Code

- Names: components `PascalCase.tsx`, other files `feature.part.ts`
  (`shiurim.service.ts`), folders `kebab-case`.
- Times: use the existing helpers (`STARTS_AT_NY` in map.queries.ts,
  `nyTimeToUtc` in seed.ts). Never write your own conversion.
- Comments: match the style already in the code (see `features/map/`).
  Short, simple words:
  - Top of every file: one line on what it does. Then, if useful, how it fits
    with other files, what doesn't belong in it, or a short example.
  - Functions and types: a `/** */`, one line unless it's tricky; then say
    what would go wrong (e.g. "a 10am shiur shows up at 3pm").
  - Inside code: why, when it isn't obvious.
  - Point to other files or docs when they explain more.
  - Long files: split into sections with `// ------------- name` lines.
  - Mention the requirement (FR-5, NFR-4) when it relates to one.
  - No commented-out code.

## Database

- Test data in the shared database: titles start with `TEST`.

## Commits and PRs

- Short and simple, only what's needed.
- Before committing, run `npm run format`.
- After pulling, if `package-lock.json` changed, run `npm install`.
- Every PR updates the docs its change affects (README, `docs/architecture.md`,
  CLAUDE.md).
- No AI attribution lines (no "Generated with Claude Code", no Co-Authored-By).
- If a PR's steps include `npm install`, add: "If it fails with
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (network/antivirus filter), run
  `NODE_OPTIONS=--use-system-ca npm install`."
