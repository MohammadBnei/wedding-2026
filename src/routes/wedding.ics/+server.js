import { icsBody } from '$lib/ics.js';

/**
 * The add-to-calendar file. A route rather than a static file so the date and
 * address come from wedding.js — the one place a fact is allowed to live — and
 * cannot drift from what the page prints above the button. Body and the reasons
 * for its contents are in $lib/ics.js.
 *
 * @type {import('./$types').RequestHandler}
 */
export function GET({ locals }) {
  return new Response(icsBody(locals.lang), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="leila-mohammad-amine.ics"',
      'cache-control': 'public, max-age=3600',
      // This file DOES carry the address — a calendar entry without one is
      // useless. Keeping it out of search indexes is the point: the venue is
      // for guests who open the invitation, not for anyone who searches.
      'x-robots-tag': 'noindex'
    }
  });
}
