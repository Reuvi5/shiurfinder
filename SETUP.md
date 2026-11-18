# Running ShiurFinder

Two ways to get a database. Pick one.

- **Shared AWS** — no Docker needed, everyone sees the same data. Your IP must
  be allowed through the firewall first; ask Reuvi.
- **Local Docker** — your own private database, works offline, safe to break.
  Needs Docker Desktop.

---

## 1. Prerequisites

**Node 20 or newer.** Check with `node --version`.

macOS, if you don't have it:
```bash
brew install node
```
No Homebrew? Download the LTS installer from https://nodejs.org, run it, then
**quit and reopen your terminal** — PATH doesn't update in an open one.

Windows: download the LTS installer from https://nodejs.org.

## 2. Get the code

```bash
git clone https://github.com/Reuvi5/shiurfinder.git
cd shiurfinder
npm install
```

## 3. Make your .env

```bash
cp .env.example .env
```

Open `.env` and set `DATABASE_URL`.

**Shared AWS** — ask Reuvi for the password, then:
```
DATABASE_URL="postgresql://shiurfinder:PASSWORD@shiurfinder-db.c2hk8ucusgbx.us-east-1.rds.amazonaws.com:5432/shiurfinder?schema=public&sslmode=require"
```
Your IP has to be allowed through the RDS firewall. Run `curl ifconfig.me` and
send Reuvi the number. Without that you get a connection timeout and no error
message worth reading.

**Local Docker** — leave the localhost line as it is, then:
```bash
npm run db:up        # starts Postgres + PostGIS
sleep 15             # it accepts connections a few seconds after "started"
npm run db:migrate
npm run db:seed
```

## 4. Run it

```bash
npm run prisma:generate --workspace @shiurfinder/server
npm run dev
```

Open http://localhost:5173.

The map area will be grey until someone adds a Google Maps key — see
`VITE_GOOGLE_MAPS_BROWSER_KEY` in `.env`. The Featured and Weekly lists work
without it.

---

## Things that will bite you

**`npm run db:migrate` against the shared database.** It runs `prisma migrate
dev`, which drops and recreates the schema — it would wipe everyone's data. A
guard script blocks it unless `DATABASE_URL` points at localhost. To apply new
migrations to the shared database use `npm run db:deploy`, which is safe.

**Your IP changes.** Home connections rotate addresses. When that happens the
app hangs with no useful error and nothing in the code has changed. Re-run
`curl ifconfig.me` and send Reuvi the new number.

**Never commit `.env`.** It holds the real database password. `.gitignore`
covers it, but don't force it.

**Ports.** Server 3001, website 5173. If you get `EADDRINUSE`, something is
still running: `lsof -ti:3001 | xargs kill -9`.

## Branching

`main` is the integration branch; nothing is pushed to it directly.

```bash
git checkout -b feat/fr20-create-shiur
git commit -m "feat(shiurim): add create form"
git push -u origin feat/fr20-create-shiur
```
Then open a PR and have one of the others review it.
