/**
 * The song list's pure half. Outside `$lib/server/` for the reason stated at the
 * top of wall.js: `$env/dynamic/private` does not resolve under `bun test`, so
 * anything worth asserting on has to live out here.
 *
 * Two sources feed this. `wall_post.song` is where requests land today; the
 * older `rsvp.song` is still full of them from before the RSVP section came off
 * the page. Neither is a table of songs — both are free text a guest typed.
 */

import { fold } from './match.js';

/**
 * The key two spellings of one song have to agree on.
 *
 * `fold()` alone is not enough here, and the reason is in the autocomplete: it
 * offers `${trackName} — ${artistName}` with an EM DASH
 * (routes/api/songs/+server.js), while a guest typing the same song by hand
 * writes "-", or " - ", or just the title. Those are the three realistic
 * spellings and fold() — which only strips diacritics and lowercases — keeps
 * all three apart, on a list whose whole premise is that they are one row.
 *
 * So: fold, then collapse every run of non-alphanumerics to a single space.
 * "Bella Ciao — Modena City Ramblers" and "bella ciao - modena city ramblers"
 * land on the same key; "Bella Ciao" alone still does not, and should not.
 *
 * Also the localStorage key for the played mark, which is why it has to be
 * stable across a reload and across a re-spelling by the next guest.
 *
 * @param {string} s
 * @returns {string}
 */
export const songKey = (s) => fold(s).replace(/[^a-z0-9]+/gu, ' ').trim();

/**
 * @typedef {object} SongRow
 * @property {string} song  what the guest typed
 * @property {string | null} who  the name they signed it with, if any
 * @property {string} at  ISO 8601. A STRING, not a Date — postgres.js hands back
 *   Date objects and every sibling route converts at the boundary
 *   (admin/+page.server.js, admin/queue/+server.js). Converting here instead
 *   would leave the tests passing on strings while production sorted Dates.
 */

/**
 * @typedef {object} MergedSong
 * @property {string} song  the first-seen spelling, which is what gets displayed
 * @property {string[]} who  everyone who asked, deduped, in first-seen order
 * @property {string} at  the most recent request for this song
 * @property {number} count how many times it was asked for
 */

/**
 * Fold the two sources into one list: one row per distinct song, most recently
 * requested first, carrying everyone who asked for it.
 *
 * Deliberately keeps the FIRST spelling seen rather than the most common one.
 * The rows arrive newest-first, so that is the most recent spelling, and picking
 * a winner by frequency would mean the displayed text changed under the reader
 * as the evening went on.
 *
 * @param {SongRow[]} rows
 * @returns {MergedSong[]}
 */
export function mergeSongs(rows) {
  /** @type {Map<string, MergedSong>} */
  const byKey = new Map();

  for (const row of rows) {
    const song = String(row.song ?? '').trim();
    if (!song) continue;
    const key = songKey(song);
    // A song of pure punctuation folds to an empty key, which would collapse
    // every such request into one meaningless row.
    if (!key) continue;

    const who = String(row.who ?? '').trim();
    const hit = byKey.get(key);

    if (!hit) {
      byKey.set(key, { song, who: who ? [who] : [], at: row.at, count: 1 });
      continue;
    }

    hit.count += 1;
    if (who && !hit.who.includes(who)) hit.who.push(who);
    // The two sources are concatenated, not interleaved, so "newest first" is
    // only true within each. Take the max rather than trusting arrival order.
    if (row.at > hit.at) hit.at = row.at;
  }

  return [...byKey.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
