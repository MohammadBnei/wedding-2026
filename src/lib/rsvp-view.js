/**
 * What /admin shows out of what it loaded: the search box and the sortable
 * column headers, as one pure function.
 *
 * Pulled out of the route for the same reason `rsvp-summary.js` was — it is the
 * only genuinely new logic on a page whose whole design position is that it has
 * none, and a sort comparator is exactly the kind of thing that is quietly
 * wrong. Here it is testable without a browser or a database.
 */

/** The columns a header click can sort by. */
/** @typedef {'name' | 'going' | 'headcount' | 'updated_at'} SortKey */

/**
 * The columns the search box looks in. Everything a guest typed, plus their
 * name — searching by `lang` or by date is what the column headers are for.
 */
const FIELDS = /** @type {const} */ (['name', 'email', 'song', 'message']);

/**
 * @param {import('./rsvp-summary.js').RsvpRow[]} rows as `summarise` left them
 * @param {string} [q] search text; blank means everything
 * @param {SortKey} [key]
 * @param {1 | -1} [dir]
 * @returns {import('./rsvp-summary.js').RsvpRow[]}
 */
export function view(rows, q = '', key = 'updated_at', dir = -1) {
  const needle = q.trim().toLowerCase();

  const kept = needle
    ? rows.filter((r) =>
        FIELDS.some((f) =>
          String(r[f] ?? '')
            .toLowerCase()
            .includes(needle)
        )
      )
    : rows;

  // A copy: `rows` is page data, and sorting it in place mutates what the next
  // derived run reads from.
  return [...kept].sort((a, b) => compare(a[key], b[key], dir));
}

/**
 * `dir` is applied inside rather than multiplied outside so that a missing
 * value stays at the bottom in BOTH directions. A guest who left no song is not
 * "before" or "after" the ones who did — they are the ones you scroll past, and
 * flipping the sort to bring a column's blanks to the top hides the rows you
 * clicked the header to look at.
 *
 * @param {unknown} x
 * @param {unknown} y
 * @param {1 | -1} dir
 */
function compare(x, y, dir) {
  const xe = x === null || x === undefined;
  const ye = y === null || y === undefined;
  if (xe || ye) return xe && ye ? 0 : xe ? 1 : -1;

  if (typeof x === 'string' && typeof y === 'string') return dir * x.localeCompare(y);

  // Booleans (`going`), numbers (`headcount`) and Dates (`updated_at`) all
  // order under < once neither side is missing.
  return dir * (x === y ? 0 : /** @type {any} */ (x) < /** @type {any} */ (y) ? -1 : 1);
}
