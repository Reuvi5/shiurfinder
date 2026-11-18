// Refuses to run a destructive Prisma command against anything but localhost.
//
// `prisma migrate dev` and `migrate reset` drop and recreate the schema when
// they see drift. That is fine on a disposable local database and catastrophic
// on the shared RDS one, where it would wipe the other two developers' work.
//
// Used by the db:migrate and db:reset scripts.
try {
  require('dotenv').config();
} catch {
  // dotenv missing: fall back to whatever is already in the environment.
}

const url = process.env.DATABASE_URL ?? '';

if (!url) {
  console.error('\n  DATABASE_URL is not set. Check your .env file.\n');
  process.exit(1);
}

const host = (url.match(/@([^:/?]+)/) ?? [])[1] ?? '(unknown)';
const isLocal = host === 'localhost' || host === '127.0.0.1' || host === 'db';

if (!isLocal) {
  console.error(`
  ─────────────────────────────────────────────────────────────
   Refusing to run a destructive migration.

   DATABASE_URL points at:  ${host}

   'prisma migrate dev' and 'migrate reset' DROP AND RECREATE the
   schema. Against the shared database that destroys everyone's data.

   If you meant to apply migrations to a shared database, use:

       npm run db:deploy

   which applies pending migrations without resetting anything.
  ─────────────────────────────────────────────────────────────
`);
  process.exit(1);
}
