#!/usr/bin/env bun
/**
 * Loads the guest list CSV into the `guest` table.
 *
 * Run by hand, never by CI and never by the app: the CSV is gitignored and
 * dockerignored (real names, public repo), so it exists only on a laptop. That
 * is also why the names live in Postgres at all — nothing else can carry them
 * to production.
 *
 *   # local dev DB (the one dev-local.sh starts)
 *   WEDDING_DB_HOST=localhost WEDDING_DB_PORT=55432 WEDDING_DB_NAME=weddingdb \
 *   WEDDING_DB_USER=postgres WEDDING_DB_PASSWORD=postgres \
 *     bun scripts/seed-guests.js "Wedding Guest List - 5 September 202 - Guest List.csv"
 *
 *   # production
 *   infisical run --projectId=798540d3-0c3e-47ee-b447-468d65088377 --env=dev --silent -- \
 *     bun scripts/seed-guests.js "Wedding Guest List - 5 September 202 - Guest List.csv"
 */
import postgres from 'postgres';

const path = process.argv[2];
if (!path) {
  console.error('usage: bun scripts/seed-guests.js <guest-list.csv>');
  process.exit(1);
}

// ponytail: naive split on commas over the first three columns. Safe because no
// name, companion count or status in this export is quoted or contains a comma
// — the Note column does, but we never read it. Reach for a real CSV parser the
// day a name does.
const rows = (await Bun.file(path).text())
  .split('\n')
  .slice(1)
  .map((line) => line.split(','))
  .map(([name, companion]) => ({ name: (name ?? '').trim(), companion: Number(companion) || 0 }))
  // Trailing spaces are all over the export (`Othmane `, `Rkia `) and would
  // otherwise become distinct suggestions from their trimmed twins.
  .filter((g) => g.name);

if (!rows.length) {
  console.error(`no guests parsed from ${path}`);
  process.exit(1);
}

// Everyone, including "Not Coming": they can still open the site to say no.
const sql = postgres({
  host: process.env.WEDDING_DB_HOST ?? 'localhost',
  port: Number(process.env.WEDDING_DB_PORT ?? 5432),
  database: process.env.WEDDING_DB_NAME ?? 'weddingdb',
  username: process.env.WEDDING_DB_USER ?? 'postgres',
  password: process.env.WEDDING_DB_PASSWORD ?? 'postgres',
  max: 1
});

await sql`
  CREATE TABLE IF NOT EXISTS guest (
    name        text PRIMARY KEY,
    companion   int  NOT NULL DEFAULT 0
  )`;
await sql`
  INSERT INTO guest ${sql(rows, 'name', 'companion')}
  ON CONFLICT (name) DO UPDATE SET companion = EXCLUDED.companion`;

const [{ count }] = await sql`SELECT count(*)::int FROM guest`;
console.log(`seeded ${rows.length} rows from ${path}; ${count} guests in the table`);
await sql.end();
