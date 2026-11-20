// Safety check that runs before `npm run db:migrate` and `npm run db:reset`.
//
// Those commands can DELETE ALL DATA: `prisma migrate dev` and `migrate reset`
// drop and rebuild the database when they think it's out of sync. That's fine
// on your own local Docker database, and a disaster on the shared AWS one.
//
// So this script stops the command unless DATABASE_URL points at your own
// machine. It only protects you if you go through npm. Running
// `npx prisma migrate dev` directly skips this check, so don't.

const url = process.env.DATABASE_URL ?? '';

if (!url) {
  console.error('\n  DATABASE_URL is not set. Check your .env file.\n');
  process.exit(1);
}

// The host is the part after "@", e.g. "localhost" or "shiurfinder-db.xxxx.rds.amazonaws.com".
const host = (url.match(/@([^:/?]+)/) ?? [])[1] ?? '(unknown)';
const isLocal = host === 'localhost' || host === '127.0.0.1' || host === 'db';

if (!isLocal) {
  console.error(`
  ─────────────────────────────────────────────────────────────
   Stopped: this command could wipe the shared database.

   DATABASE_URL points at:  ${host}

   'migrate dev' and 'migrate reset' can delete and rebuild every
   table. On the shared database that destroys everyone's data.

   To apply migrations that already exist to the shared database:

       npm run db:deploy

   To create a NEW migration, switch DATABASE_URL to your local
   Docker database first (see README, "Changing the database").
  ─────────────────────────────────────────────────────────────
`);
  process.exit(1);
}
