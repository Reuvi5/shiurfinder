// Runs once before the SQL tests (`npm run test:db`): checks the test database
// is on this computer, then brings its tables up to date.
//
// The test database is TEST_DATABASE_URL: from the environment on GitHub, or
// from .env on your computer. Never the shared one (README, "Tests").

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

/** npm scripts run from the repo root. */
const ROOT = process.cwd();
const SERVER = join(ROOT, 'server');

/** The SQL tests' database address, or '' if none is set. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envFile = join(ROOT, '.env');
  if (!existsSync(envFile)) return '';
  return parseEnv(readFileSync(envFile, 'utf8')).TEST_DATABASE_URL ?? '';
}

export default function setup(): void {
  const url = testDatabaseUrl();
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. See README, "Tests".');
  }
  const env = { ...process.env, DATABASE_URL: url };

  // The same check db:migrate uses: stops here unless the database is local.
  execFileSync(process.execPath, ['scripts/guard-local-db.js'], {
    cwd: SERVER,
    env,
    stdio: 'inherit',
  });

  // Runs Prisma with node directly: `npx` can't be started this way on Windows.
  const prisma = join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prisma, 'migrate', 'deploy'], {
    cwd: SERVER,
    env,
    stdio: 'inherit',
  });
}
