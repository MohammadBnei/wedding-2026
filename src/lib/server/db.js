import postgres from 'postgres';
import { env } from '$env/dynamic/private';

/**
 * Pigsty lives outside the cluster at postgres.bnei.lan. Port 5432 deliberately,
 * NOT 6432 — pgbouncer defaults to transaction pooling, which breaks prepared
 * statements. Both authentik and ente hit that already on this cluster.
 */
export const sql = postgres({
  host: env.WEDDING_DB_HOST ?? 'localhost',
  port: Number(env.WEDDING_DB_PORT ?? 5432),
  database: env.WEDDING_DB_NAME ?? 'weddingdb',
  username: env.WEDDING_DB_USER ?? 'postgres',
  password: env.WEDDING_DB_PASSWORD ?? 'postgres',
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10
});

/** @type {Promise<void> | undefined} */
let ready;
let up = false;
let lastTry = 0;

// How long to wait before trying an unreachable database again. Retrying on
// every request would stall each one for `connect_timeout` seconds, which turns
// "the RSVP form is off" into "the whole site hangs".
// ponytail: a fixed interval, not exponential backoff. Thirty seconds of stale
// "down" is invisible to a guest; add backoff if this ever fronts something
// that charges per connection attempt.
const RETRY_MS = 30_000;

/**
 * Is the database reachable right now?
 *
 * The site is an invitation first and a form second: the schedule, the address,
 * the travel notes and the chatbot's canned answers are all in wedding.js and
 * need no database at all. So Postgres being down must degrade the site, not
 * take it out — the same bargain `aiConfigured()` already makes for the model
 * provider (see chat.js).
 *
 * Callers: use `dbOr()` for anything a guest can live without. Use this
 * directly for the RSVP write, which they cannot — a silently dropped RSVP is
 * worse than an honest "not right now".
 */
export function dbUp() {
  return up;
}

/**
 * Run a query, degrading to `fallback` when the database is unreachable.
 *
 * For reads and for best-effort writes (the chat transcript). NOT for the RSVP:
 * returning a fallback there would tell a guest they had replied when nothing
 * was stored.
 *
 * Two type parameters on purpose: the fallback is usually a DIFFERENT shape
 * from the query result (`null` for a row list, `[]` for rows), and collapsing
 * them to one would erase the row type at every call site.
 *
 * @template T
 * @template F
 * @param {F} fallback
 * @param {() => Promise<T>} run
 * @returns {Promise<T | F>}
 */
export async function dbOr(fallback, run) {
  if (!up) return fallback;
  try {
    return await run();
  } catch (err) {
    // The connection died after migrate() succeeded. Mark it down so the next
    // request short-circuits instead of paying the timeout again.
    console.error('[db] query failed, degrading:', err instanceof Error ? err.message : err);
    up = false;
    lastTry = Date.now();
    return fallback;
  }
}

/**
 * ponytail: idempotent DDL at boot rather than a PreSync migration hook and a
 * second image. One replica, no race, three tables. Move to a hook (agent-fleet's
 * `migrate` shape) the day this needs a second replica or a destructive change.
 *
 * Never rejects. It is awaited by `hooks.server.js` on every request, so a
 * throw here would be a 500 on every page including the ones that need no data.
 */
export function migrate() {
  if (up) return Promise.resolve();
  if (ready) return ready;
  if (Date.now() - lastTry < RETRY_MS) return Promise.resolve();

  lastTry = Date.now();
  ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS rsvp (
        visitor_id  uuid PRIMARY KEY,
        going       boolean NOT NULL,
        name        text    NOT NULL,
        headcount   int     NOT NULL DEFAULT 1,
        song        text,
        message     text,
        lang        text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS chat_message (
        id          bigserial PRIMARY KEY,
        visitor_id  uuid NOT NULL,
        role        text NOT NULL CHECK (role IN ('user','assistant')),
        content     text NOT NULL,
        lang        text,
        created_at  timestamptz NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE INDEX IF NOT EXISTS chat_message_visitor_idx
        ON chat_message (visitor_id, created_at)`;
    // The real guest list. It lives here rather than in the repo because the CSV
    // export is gitignored on purpose — real names, and this repo is public.
    // Populated out-of-band by `scripts/seed-guests.js`, never by the app.
    await sql`
      CREATE TABLE IF NOT EXISTS guest (
        name        text PRIMARY KEY,
        companion   int  NOT NULL DEFAULT 0
      )`;
    up = true;
  })()
    .catch((err) => {
      console.error(
        '[db] unreachable — serving the invitation without RSVP or chat history:',
        err instanceof Error ? err.message : err
      );
      up = false;
    })
    // Cleared either way: on success `up` short-circuits the fast path above,
    // and on failure this is what lets the next attempt after RETRY_MS happen.
    .finally(() => {
      ready = undefined;
    });

  return ready;
}
