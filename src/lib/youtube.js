/**
 * Matching a typed song title to something playable, without an API key.
 *
 * ponytail: this reads the first video id out of YouTube's own search HTML.
 * It is scraping, it will break the day YouTube changes the shape of
 * `ytInitialData`, and the failure mode is deliberately a page full of working
 * search links rather than an error. The upgrade path is the YouTube Data API
 * (search.list, 100 units a call) and one key in Infisical — worth doing the
 * first time this breaks, not before.
 *
 * Pure on purpose: no $env, no fetch. The fetching half lives in
 * routes/admin/songs/yt/+server.js so that this half is reachable from
 * `bun test`, which cannot import a route.
 */

/**
 * The results page for a query.
 *
 * `sp=EgIQAQ%3D%3D` is the "Videos" filter, and it is not cosmetic. Without it
 * the first `"videoId"` in the payload is routinely an ad, a Short, or a
 * "people also watched" shelf — and the page that consumes this labels a match
 * "Play", so a wrong id is a link that lies about where it goes.
 *
 * Also the honest fallback: when nothing can be resolved, this URL is what the
 * reader gets, and it is a page that answers their question.
 *
 * @param {string} q
 * @returns {string}
 */
export const searchUrl = (q) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`;

/**
 * @param {string} id an 11-character video id
 * @returns {string}
 */
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/**
 * The first video id in a results page, or null.
 *
 * The quotes on BOTH sides are load-bearing: they anchor the match to a whole
 * JSON string value, so a 12-character id cannot match on its first 11
 * characters — the regex simply moves on to the next `"videoId"` occurrence.
 *
 * Returns null rather than throwing on anything unexpected, which covers the
 * three failures that actually happen: a consent interstitial, a bot check, and
 * a genuine no-results page. All three contain no `"videoId"` at all.
 *
 * @param {string} html
 * @returns {string | null}
 */
export const firstVideoId = (html) => String(html ?? '').match(/"videoId":"([\w-]{11})"/)?.[1] ?? null;
