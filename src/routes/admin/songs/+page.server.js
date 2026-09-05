import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { sql, dbUp, dbOr } from '$lib/server/db.js';
import { mergeSongs } from '$lib/songs.js';

/**
 * Every song anyone asked for, in one list, for whoever is running the music.
 *
 * The same 404-instead-of-leak hint as /admin and /admin/queue. NOT the
 * security boundary — the forwardAuth middleware on the PathPrefix('/admin')
 * IngressRoute in helm/values.yaml is, and this route inherits it for free by
 * living under that prefix.
 *
 * Deliberately does NO network here. The YouTube match is resolved one row at a
 * time from the browser against /admin/songs/yt — see the long note in that
 * file for why resolving them all in this function would be an OOMKill.
 *
 * @type {import('./$types').PageServerLoad}
 */
export async function load({ request }) {
  if (!dev && !request.headers.get('x-authentik-username')) error(404);

  /**
   * Both sources, in one round trip.
   *
   * `status <> 'rejected'` rather than no status filter at all: a `pending`
   * post is usually one whose PHOTO the model could not clear, and the song
   * riding along with it is still a song someone asked for. A post moderation
   * actually refused is different — its text should not be read out here, nor
   * sent to Google from the cluster's egress IP.
   *
   * dbOr, unlike the writes in /admin: a missing list is losable, and 500ing the
   * page an hour before the first dance is not. LIMIT because the row count is
   * guest-controlled free text.
   */
  const rows = await dbOr(
    [],
    () => sql`
      SELECT song, author AS who, created_at AS at
        FROM wall_post
       WHERE song IS NOT NULL AND deleted_at IS NULL AND status <> 'rejected'
      UNION ALL
      SELECT song, name AS who, updated_at AS at
        FROM rsvp
       WHERE song IS NOT NULL AND deleted_at IS NULL
       LIMIT 500`
  );

  return {
    canRead: dbUp(),
    // postgres.js hands back `at` as a Date. Converted here, at the boundary,
    // the way admin/+page.server.js and admin/queue/+server.js already do —
    // mergeSongs compares `at` as a string and its tests use strings, so a Date
    // slipping through would sort correctly in the tests and wrongly in
    // production.
    songs: mergeSongs(
      rows.map((/** @type {any} */ r) => ({
        song: r.song,
        who: r.who,
        at: new Date(r.at).toISOString()
      }))
    )
  };
}
