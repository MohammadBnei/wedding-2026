import { json } from '@sveltejs/kit';
import { fold, MIN_CHARS } from '$lib/match.js';
const LIMIT = 8;

// ponytail: a plain Map, wiped wholesale when it gets big. Together with the
// client-side debounce this is what keeps us under iTunes' unpublished rate
// limit. Swap for an LRU with a TTL if the search ever gets hot enough to care.
/** @type {Map<string, {value: string}[]>} */
const cache = new Map();

/**
 * Suggestions for the RSVP song field, proxied from the iTunes Search API.
 *
 * Server-side rather than from the browser because iTunes' CORS headers are not
 * something to bet a form field on. No key, no account, no new dependency.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url, fetch }) {
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < MIN_CHARS) return json([]);

  const key = fold(q);
  const hit = cache.get(key);
  if (hit) return json(hit);

  const search = new URL('https://itunes.apple.com/search');
  search.searchParams.set('term', q);
  search.searchParams.set('entity', 'song');
  search.searchParams.set('limit', String(LIMIT));

  // A dead or throttled iTunes must never break typing in the field, so every
  // failure path lands on an empty list rather than a 500.
  const results = await fetch(search)
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => body?.results ?? [])
    .catch(() => []);

  const songs = results
    .filter((/** @type {any} */ r) => r.trackName && r.artistName)
    .map((/** @type {any} */ r) => ({ value: `${r.trackName} — ${r.artistName}` }));

  if (songs.length) {
    if (cache.size > 200) cache.clear();
    cache.set(key, songs);
  }
  return json(songs);
}
