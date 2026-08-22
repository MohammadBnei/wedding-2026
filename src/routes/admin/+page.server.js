import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { summarise } from '$lib/rsvp-summary.js';

/**
 * NOT the security boundary. `default/authentik-forwardauth` on the
 * Host(...) && PathPrefix(`/admin`) route in helm/values.yaml is — this header
 * is set by that middleware and a caller already on the pod network could forge
 * it, so nothing may be authorised on the strength of it.
 *
 * What it buys: the gate lives entirely in a Traefik route, and a route can be
 * got wrong. Traefik's default priority is rule length, so an explicit priority
 * below Host(`wedding.bnei.dev`)'s ~26 would hand /admin to the ordinary route
 * and serve the whole guest list to the internet with a 200. This turns that
 * mistake into a 404 instead of a leak. Dev has no Traefik in front of it at
 * all, hence the bypass.
 *
 * The actions below re-run it rather than assume a POST here could only have
 * followed the load. They are separate entry points, and a 404 on the read with
 * a working delete underneath is the same routing mistake, only quieter.
 *
 * @param {Request} request
 * @returns {string} the authentik username, or '' in dev
 */
function gate(request) {
  const who = request.headers.get('x-authentik-username');
  if (!dev && !who) error(404);
  return who ?? '';
}

/**
 * The key a row is deleted by. Deliberately the SAME key summarise() dedupes on
 * (`src/lib/rsvp-summary.js`): the table shows one row per guest, so deleting
 * that row has to take the phone reply and the laptop reply with it. Keying on
 * `visitor_id` would remove whichever of the pair is newest and let the older
 * one take its place, which reads as a delete that did not work.
 *
 * @param {FormData} form
 */
function nameKey(form) {
  return String(form.get('name') ?? '')
    .trim()
    .toLowerCase();
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ request }) {
  const who = gate(request);

  // postgres.js hands back an untyped RowList; the SELECT below is what makes
  // these the columns of an RsvpRow. Cast at the boundary, once, rather than
  // loosening the summarise() signature that the arithmetic depends on.
  const rows = /** @type {import('$lib/rsvp-summary.js').RsvpRow[]} */ (
    await dbOr(
      [],
      () => sql`
        SELECT name, going, headcount, email, song, message, lang, updated_at
        FROM rsvp
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC`
    )
  );

  return { ...summarise(rows), canRead: dbUp(), who: who || (dev ? 'dev' : '') };
}

/** @type {import('./$types').Actions} */
export const actions = {
  /**
   * Soft delete every row under this name.
   *
   * `dbOr` is deliberately not used, for the same reason the RSVP write avoids
   * it (`src/routes/+page.server.js`): an admin shown "deleted" for a row that
   * is still in the table counts that guest again at catering time, and nobody
   * finds out until the numbers are wrong.
   */
  delete: async ({ request }) => {
    gate(request);
    const form = await request.formData();
    const key = nameKey(form);
    if (!key) return fail(400, { message: 'No name given.' });

    try {
      await sql`
        UPDATE rsvp SET deleted_at = now()
        WHERE lower(trim(name)) = ${key} AND deleted_at IS NULL`;
    } catch (err) {
      console.error('[admin] delete failed:', err instanceof Error ? err.message : err);
      return fail(503, { message: 'Postgres refused it — nothing was deleted.' });
    }

    // Handed back so the page can offer the undo.
    return { deleted: String(form.get('name') ?? '') };
  },

  /**
   * ponytail: the undo for the delete you just made, and nothing further —
   * there is no view of deleted rows, so a mistake noticed a day later needs the
   * one-line UPDATE in the README. Build the view the first time that happens.
   */
  restore: async ({ request }) => {
    gate(request);
    const form = await request.formData();
    const key = nameKey(form);
    if (!key) return fail(400, { message: 'No name given.' });

    try {
      await sql`UPDATE rsvp SET deleted_at = NULL WHERE lower(trim(name)) = ${key}`;
    } catch (err) {
      console.error('[admin] restore failed:', err instanceof Error ? err.message : err);
      return fail(503, { message: 'Postgres refused it — nothing was restored.' });
    }

    return { restored: String(form.get('name') ?? '') };
  }
};
