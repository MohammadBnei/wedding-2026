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
      // `private`, and Vary on the cookie: SUMMARY is localized from the `lang`
      // cookie, so a shared cache would pin one visitor's language for everyone,
      // and a plain `public, max-age` would hand a guest who switched language
      // the previous language's file for the next hour.
      'cache-control': 'private, max-age=3600',
      vary: 'cookie',
      // This file DOES carry the address — a calendar entry without one is
      // useless. Keeping it out of search indexes is the point: the venue is
      // for guests who open the invitation, not for anyone who searches.
      'x-robots-tag': 'noindex'
    }
  });
}
