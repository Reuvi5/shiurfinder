-- Occurrence times become timestamptz.
--
-- They were TIMESTAMP (no time zone) holding UTC. On that type,
-- "startsAt" AT TIME ZONE 'America/New_York' reads the value AS New York time
-- instead of converting UTC to New York, so evening shiurim landed on the next
-- day and the "today" card came back empty. On timestamptz the same expression
-- is correct, and comparisons with NOW() no longer depend on the server's
-- TimeZone setting.
--
-- USING ... AT TIME ZONE 'UTC' says the stored values are UTC, so existing rows
-- convert correctly whatever the session time zone is.

-- AlterTable
ALTER TABLE "Occurrence"
  ALTER COLUMN "startsAt" SET DATA TYPE TIMESTAMPTZ(3) USING "startsAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "endsAt" SET DATA TYPE TIMESTAMPTZ(3) USING "endsAt" AT TIME ZONE 'UTC';
