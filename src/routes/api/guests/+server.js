import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db.js';
import { match } from '$lib/match.js';

const MIN_CHARS = 2;
const TTL = 60_000;

/** @type {{ value: string, count: number }[]} */
let cache = [];
let fetchedAt = 0;

async function guests() {
  if (Date.now() - fetchedAt < TTL) return cache;
  const rows = await sql`SELECT name, companion FROM guest`;
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
