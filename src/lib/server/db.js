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
    console.error('[db] query failed:', err instanceof Error ? err.message : err);
    // Only a CONNECTION failure means "the database is down". An ordinary
    // statement error does not, and conflating them is a denial of service:
    // a chat message containing a NUL byte makes Postgres reject that one
    // INSERT on a perfectly healthy connection, and if that marked the whole
    // database down, every guest would lose the RSVP form for the next 30 s —
    // repeatable on demand.
    if (isConnectionError(err)) {
      up = false;
      lastTry = Date.now();
    }
    return fallback;
  }
}

/**
 * Did this fail because we cannot reach Postgres, or because the statement was
 * bad? SQLSTATE class 08 is "connection exception"; postgres.js raises its own
 * CONNECTION_* codes before a socket exists, and a dropped socket surfaces as a
 * Node errno. Anything else is the query's fault, not the server's.
 *
 * @param {unknown} err
 */
function isConnectionError(err) {
  const code = String(/** @type {{ code?: unknown }} */ (err)?.code ?? '');
  return (
    code.startsWith('08') ||
    code.startsWith('CONNECTION_') ||
    ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH'].includes(code)
  );
}

/**
 * ponytail: idempotent DDL at boot rather than a PreSync migration hook and a
 * second image. One replica, no race, three tables. Move to a hook (agent-fleet's
 * `migrate` shape) the day this needs a second replica or a destructive change.
 *
 * Never rejects, and never blocks a request for long. It is awaited by
 * `hooks.server.js` on every request, so a throw here would be a 500 on every
 * page including the ones that need no data — and a slow one would be a hang.
 *
 * A refused connection fails in milliseconds, but a black-holed host (firewall
 * dropping packets, node evicted mid-request) does not fail at all until
 * `connect_timeout`, ten seconds later. So callers wait GRACE_MS at most and
 * then get on with rendering the invitation; the attempt keeps running in the
 * background and flips `up` if and when it lands.
 */
const GRACE_MS = 1_500;

export function migrate() {
  if (up) return Promise.resolve();
  if (ready) return race(ready);
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
        email       text,
        lang        text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )`;
    // `CREATE TABLE IF NOT EXISTS` above is a no-op on a table that already
    // exists, so the column in it reaches fresh databases only — local compose
    // and CI. The deployed table needs this line, and will keep needing one per
    // column added from here on. Additive and idempotent, which is the whole
    // reason this is tolerable without a migration tool; a DESTRUCTIVE change
    // is the point at which the ponytail note above comes due.
    await sql`ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS email text`;
    // Soft delete for /admin. Additive and idempotent like the line above, which
    // is what keeps the ponytail note at the top of this function from coming
    // due: the delete itself is an UPDATE, so nothing here is destructive and no
    // migration tool is needed. Recovery is one statement — see the README.
    await sql`ALTER TABLE rsvp ADD COLUMN IF NOT EXISTS deleted_at timestamptz`;
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
    // The guest wall. Image bytes live in Garage; only the two object keys are
    // here — the same bargain chat_message makes by keeping no blobs either.
    //
    // `id` is a uuid rather than a bigserial ON PURPOSE: it is the public URL of
    // the photo (/api/wall/img/<id>.jpg), and a sequential id would let anyone
    // walk the wall, including the posts /admin has just binned.
    //
    // Both CHECKs are NAMED. Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so
    // an unnamed constraint can never be altered idempotently later — and since
    // `CREATE TABLE IF NOT EXISTS` is a no-op on a table that already exists,
    // the first time a fourth status is wanted the change would be destructive,
    // which is exactly the trigger the ponytail note at the top of this function
    // names. Naming them now is free; not naming them costs a migration tool.
    await sql`
      CREATE TABLE IF NOT EXISTS wall_post (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_id  uuid NOT NULL,
        author      text,
        message     text,
        orig_key    text,
        wall_key    text,
        status      text NOT NULL DEFAULT 'pending'
                    CONSTRAINT wall_post_status_valid
                    CHECK (status IN ('pending','approved','rejected')),
        verdict     text,
        lang        text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        decided_at  timestamptz,
        CONSTRAINT wall_post_not_empty
          CHECK (message IS NOT NULL OR wall_key IS NOT NULL)
      )`;
    // Exactly the projector's query and nothing else: a partial index over only
    // the rows it polls, in the order it wants them, so the poll needs no sort.
    // Ordered by created_at, NOT decided_at — a post approved three minutes late
    // belongs where it was written, not at the front of the queue.
    await sql`
      CREATE INDEX IF NOT EXISTS wall_post_live_idx
        ON wall_post (created_at DESC) WHERE status = 'approved'`;
    await sql`
      CREATE INDEX IF NOT EXISTS wall_post_visitor_idx
        ON wall_post (visitor_id, created_at)`;
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

  return race(ready);
}

/**
 * Wait for the in-flight migrate, but not for longer than a guest will.
 * Resolves either way — losing the race is not an error, it just means this
 * request renders the invitation without the database and the next one, a
 * moment later, will know the answer.
 *
 * @param {Promise<void>} attempt
 */
function race(attempt) {
  return Promise.race([
    attempt,
    new Promise((resolve) => setTimeout(resolve, GRACE_MS))
  ]).then(() => undefined);
}
