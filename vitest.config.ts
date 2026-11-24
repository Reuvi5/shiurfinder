// Test settings for the whole repo: `npm test` runs the unit tests, `npm run
// test:db` runs the SQL tests on a real database.
//
// Unit tests are `*.test.ts`, in a `tests/` folder beside the code they test.
// SQL tests are `*.db.test.ts` (see server/src/core/database/test-db.setup.ts).
// Rules: CLAUDE.md, "Tests". How to run them: README, "Tests".

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './server/src/core/database/test-db.setup';

/**
 * Every test runs in UTC, so code that uses the computer's own time zone
 * instead of New York fails here, not only for a user in another time zone.
 * Set here, not in the npm script: `TZ=UTC vitest` doesn't work on Windows.
 */
const TZ = 'UTC';

/**
 * Unit tests get a database address that goes nowhere, so a test that forgot
 * to fake the database fails right away instead of reaching the shared one.
 */
const NO_DATABASE = 'postgresql://no-database-in-unit-tests@127.0.0.1:1/none';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['{tests,server,web,shared}/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/*.db.test.ts'],
          env: { TZ, DATABASE_URL: NO_DATABASE },
        },
      },
      {
        // Nest finds what each class needs from type information that Vitest's
        // usual compiler drops, so the server is compiled with SWC here.
        plugins: [swc.vite({ tsconfigFile: 'server/tsconfig.json', module: { type: 'es6' } })],
        test: {
          name: 'db',
          include: ['server/**/*.db.test.ts'],
          env: { TZ, DATABASE_URL: testDatabaseUrl() },
          globalSetup: ['server/src/core/database/test-db.setup.ts'],
          // All SQL test files share one database, so they run one at a time.
          fileParallelism: false,
        },
      },
    ],
    // Which files count toward coverage: the code that decides or calculates.
    // GitHub fails a PR below these limits (CLAUDE.md, "Tests").
    coverage: {
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
      provider: 'v8',
      include: [
        'server/src/**/*.service.ts',
        'server/src/**/*.validation.ts',
        'web/src/**/*.format.ts',
        'web/src/**/*.search.ts',
        'web/src/features/map/filters.ts',
      ],
      // The database connection, not logic. It's checked by the SQL tests.
      exclude: ['server/src/core/database/**'],
    },
  },
});
