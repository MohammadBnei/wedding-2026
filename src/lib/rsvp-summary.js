/**
 * Collapse the raw `rsvp` rows into what the admin page shows.
 *
 * Pulled out of the route so the arithmetic can be tested without a database —
 * it is the only part of /admin that can be wrong in a way nobody notices until
 * the catering numbers are.
 */

/**
 * @typedef {object} RsvpRow
 * @property {string} name
 * @property {boolean} going
 * @property {number} headcount
 * @property {string | null} [email]
 * @property {string | null} [song]
 * @property {string | null} [message]
 * @property {string | null} [lang]
 * @property {Date} [updated_at]
 */

/**
 * @param {RsvpRow[]} rows newest first
 * @returns {{ rows: RsvpRow[], heads: number, replies: number, declined: number }}
 */
export function summarise(rows) {
  // The rsvp primary key is `visitor_id` — a cookie — not a person. A guest who
  // replies on their phone and then again on a laptop is two rows with the same
  // name, and summing them straight would book a table for people who do not
  // exist. Newest wins, because the later reply is the one they meant.
  //
  // ponytail: keyed on the trimmed, lowercased name, so "Amine B." and "amine
  // b" merge and "Amine Bennani" does not. Fuzzy matching (lib/match.js is
  // right there) would catch more, and would also silently merge two real
  // cousins with similar names — which is the worse error of the two, since a
  // missed duplicate is visible in the table and a wrong merge is not.
  const seen = new Set();
  /** @type {RsvpRow[]} */
  const deduped = [];
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return {
    rows: deduped,
    // `going ? count : 0` in the rsvp action means a decline already stores 0,
    // so this could just sum the column. It checks `going` anyway: the two
    // places would have to stay in step forever otherwise, and a decline that
    // somehow carried a headcount would inflate the total silently.
    heads: deduped.reduce((n, r) => n + (r.going ? r.headcount : 0), 0),
    replies: deduped.length,
    declined: deduped.filter((r) => !r.going).length
  };
}
