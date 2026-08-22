/**
 * Accent- and case-insensitive substring match over a small list.
 *
 * In SQL this would need the `unaccent` extension on Pigsty just so `theo` finds
 * `Théophile` and `remy` finds `Rémy` — the guest list is full of them. The list
 * is 74 rows, so folding in JS costs nothing and needs no extension.
 */

/**
 * Shortest query that may be answered with suggestions.
 *
 * This is a privacy floor, not a debounce tuning knob: the guest roster is real
 * names of real people on a public site, and the rule is that no query hands
 * back the whole list. It has to hold on /api/guests and /api/songs AND stop the
 * client issuing the request at all, which is three places — so it lives here,
 * beside the matching it guards.
 */
export const MIN_CHARS = 2;

/** @param {string} s */
export const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Prefix hits rank above mid-string hits, so typing `mo` offers `Mohamed` before
 * `Benaissa Mohamed`. Ties keep the caller's order.
 *
 * @template {{ value: string }} T
 * @param {T[]} items
 * @param {string} q
 * @param {number} limit
 * @returns {T[]}
 */
export function match(items, q, limit = 8) {
  const needle = fold(q);
  if (!needle) return [];

  /** @type {T[]} */ const prefix = [];
  /** @type {T[]} */ const rest = [];
  for (const item of items) {
    const at = fold(item.value).indexOf(needle);
    if (at === 0) prefix.push(item);
    else if (at > 0) rest.push(item);
  }
  return prefix.concat(rest).slice(0, limit);
}
