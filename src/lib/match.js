/**
 * Accent- and case-insensitive substring match over a small list.
 *
 * In SQL this would need the `unaccent` extension on Pigsty just so `theo` finds
 * `Théophile` and `remy` finds `Rémy` — the guest list is full of them. The list
 * is 74 rows, so folding in JS costs nothing and needs no extension.
 */

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
