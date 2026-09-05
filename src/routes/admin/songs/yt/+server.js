import { dev } from '$app/environment';
import { error, json } from '@sveltejs/kit';
import { songKey } from '$lib/songs.js';
import { firstVideoId, searchUrl, watchUrl } from '$lib/youtube.js';

/**
 * One song in, one YouTube URL out.
 *
 * Under /admin/ so it inherits the existing PathPrefix('/admin') IngressRoute
 * and its forwardAuth middleware — no new Traefik config, same as
 * /admin/queue. The header check below is the same 404-instead-of-leak hint the
 * other admin routes use: NOT the security boundary, just the thing that turns
 * a routing mistake into a 404 rather than an open endpoint that fetches
 * arbitrary search terms on request.
 *
 * ONE SONG PER REQUEST, on purpose. The obvious shape is to resolve every song
 * in the page's `load` with a Promise.all, and it is a trap: a results page is
 * ~1.3 MB of HTML, the number of distinct songs is guest-controlled (free text,
 * no uniqueness constraint, bounded only by GLOBAL_DAILY = 800), and this pod is
 * capped at 1Gi and also serves the invitation, the projector and every wall
 * image. Forty rows is ~50 MB buffered at once; eight hundred is an OOMKill on
 * the one evening that cannot be repeated. `MAX_CONCURRENT_DECODES` in
 * server/wall.js exists for the identical reason.
 *
 * Resolving one row per request instead makes the BROWSER's own
 * ~6-connections-per-origin limit the concurrency cap. No pool, no semaphore,
 * no page budget — and a failure costs one row its Play link instead of 500ing
 * the whole list.
 */

// ponytail: a plain Map, wiped wholesale when it gets big — the same shape
// /api/songs already uses against iTunes, and for the same reason. Successes
// only: a song that lost one rate-limit burst has to stay retryable rather than
// being a search link for the rest of the night. Swap for an LRU with a TTL if
// this ever outlives one evening.
/** @type {Map<string, string>} */
const cache = new Map();

/** How long to wait for YouTube before giving the reader the search link. */
const TIMEOUT_MS = 2_500;

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, request }) {
  if (!dev && !request.headers.get('x-authentik-username')) error(404);

  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return json({ url: null, matched: false });

  const key = songKey(q);
  const hit = cache.get(key);
  if (hit) return json({ url: watchUrl(hit), matched: true });

  const id = await resolve(q);
  if (id) {
    if (cache.size > 200) cache.clear();
    cache.set(key, id);
  }

  return json(
    id ? { url: watchUrl(id), matched: true } : { url: searchUrl(q), matched: false },
    // The answer is only as good as the cache behind it, and the cache dies with
    // the pod. Never let a proxy hold a Search fallback that a retry would fix.
    { headers: { 'cache-control': 'no-store' } }
  );
}

/**
 * Fetch the results page and read the top video id out of it.
 *
 * Returns null on absolutely everything that is not a clean match — a timeout,
 * a non-200, a consent wall, a bot check, a no-results page. The caller turns
 * null into a search link, so no failure here can produce a 500 or an error
 * page. That is the same bargain /api/songs makes with iTunes.
 *
 * @param {string} q
 * @returns {Promise<string | null>}
 */
async function resolve(q) {
  try {
    const res = await fetch(searchUrl(q), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // YouTube serves a different, videoId-free page to an obvious bot.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        // A datacentre IP in the EU gets the consent interstitial otherwise,
        // and that page contains no results at all.
        cookie: 'CONSENT=YES+1'
      }
    });
    if (!res.ok) return null;
    return firstVideoId(await res.text());
  } catch (err) {
    // Logged, not swallowed silently: if every song is coming back as a search
    // link, this line in Loki is the only thing that says why.
    console.error('[songs] youtube lookup failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
