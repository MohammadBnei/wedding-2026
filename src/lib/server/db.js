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

let ready;

/**
 * ponytail: idempotent DDL at boot rather than a PreSync migration hook and a
 * second image. One replica, no race, three tables. Move to a hook (agent-fleet's
 * `migrate` shape) the day this needs a second replica or a destructive change.
 */
export function migrate() {
  ready ??= (async () => {
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
  })();
  return ready;
}
