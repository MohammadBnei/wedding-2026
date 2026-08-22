import { json } from '@sveltejs/kit';
import { sql, dbOr } from '$lib/server/db.js';
import { match, MIN_CHARS } from '$lib/match.js';
const TTL = 60_000;

/** @type {{ value: string, count: number }[]} */
let cache = [];
let fetchedAt = 0;

async function guests() {
  if (Date.now() - fetchedAt < TTL) return cache;
  // With the database down this returns null rather than an empty roster, so
  // the last good cache is kept instead of being blanked — and no empty result
  // is written back, so the next request retries.
  const rows = await dbOr(null, () => sql`SELECT name, companion FROM guest`);
  if (!rows) return cache;
  // companion is the EXTRA heads, so the party size is one more than that.
  cache = rows.map((r) => ({ value: r.name, count: r.companion + 1 }));
  fetchedAt = Date.now();
  return cache;
}

/**
 * Suggestions for the RSVP name field.
 *
 * The two-character floor is deliberate: the roster is real names of real
 * people on a public site, so there is no query that hands back the whole list.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url }) {
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < MIN_CHARS) return json([]);
  return json(match(await guests(), q));
}
