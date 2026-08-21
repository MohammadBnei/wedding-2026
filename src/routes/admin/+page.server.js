import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { summarise } from '$lib/rsvp-summary.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ request }) {
  // NOT the security boundary. `default/authentik-forwardauth` on the
  // Host(...) && PathPrefix(`/admin`) route in helm/values.yaml is — this
  // header is set by that middleware and a caller already on the pod network
  // could forge it, so nothing may be authorised on the strength of it.
  //
  // What it buys: the gate lives entirely in a Traefik route, and a route can
  // be got wrong. Traefik's default priority is rule length, so an explicit
  // priority below Host(`wedding.bnei.dev`)'s ~26 would hand /admin to the
  // ordinary route and serve the whole guest list to the internet with a 200.
  // This turns that mistake into a 404 instead of a leak. Dev has no Traefik in
  // front of it at all, hence the bypass.
  const who = request.headers.get('x-authentik-username');
  if (!dev && !who) error(404);

  // postgres.js hands back an untyped RowList; the SELECT above is what makes
  // these the columns of an RsvpRow. Cast at the boundary, once, rather than
  // loosening the summarise() signature that the arithmetic depends on.
  const rows = /** @type {import('$lib/rsvp-summary.js').RsvpRow[]} */ (
    await dbOr(
      [],
      () => sql`
        SELECT name, going, headcount, email, song, message, lang, updated_at
        FROM rsvp
        ORDER BY updated_at DESC`
    )
  );

  return { ...summarise(rows), canRead: dbUp(), who: who ?? (dev ? 'dev' : '') };
}
