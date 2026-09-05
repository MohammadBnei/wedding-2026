import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { wallKeyFor, originalFor } from '$lib/server/wall.js';
import { UUID_RE } from '$lib/wall.js';
import { sql, dbOr } from '$lib/server/db.js';
import { getObject } from '$lib/server/s3.js';

/**
 * The same derivative as /api/wall/img, but at ANY status, so the queue can show
 * what it is being asked to decide about.
 *
 * It lives under /admin purely so it inherits the existing
 * `Host(...) && PathPrefix('/admin')` IngressRoute and its authentik
 * forwardAuth middleware — no new Traefik config, nothing to get wrong in
 * helm/values.yaml, where the comment already warns that two mistakes there
 * serve the guest list to the internet.
 *
 * The header check below is NOT the boundary, exactly as admin/+page.server.js
 * explains: it turns a routing mistake into a 404 instead of a leak. This is a
 * separate entry point from the page, so it re-runs it rather than assuming.
 *
 * Serves the DERIVATIVE by default — small, so a moderator's phone is not
 * pulling multi-megabyte images for every row in the list.
 *
 * `?full=1` serves the ORIGINAL, for the click-to-preview. That is the whole
 * point of the preview: judging a photograph from a 44px thumbnail is not
 * moderating it. Unlike the public route this must work for PENDING posts —
 * which is exactly the set that needs looking at, and exactly what the public
 * route refuses.
 *
 * Its Content-Type was validated against an allowlist before it was stored
 * (safeImageType in $lib/wall.js); the value arrives in the client's own
 * multipart header, so serving it unvalidated would be script execution on this
 * origin — the one holding the guest list.
 */
export async function GET({ params, request, url }) {
  if (!dev && !request.headers.get('x-authentik-username')) error(404);

  const m = /^([0-9a-f-]{36})\.jpg$/.exec(params.file);
  if (!m || !UUID_RE.test(m[1])) error(404);
  const id = m[1];

  const full = url.searchParams.get('full') === '1';

  /** @type {string | null} */
  let key = null;
  let type = 'image/jpeg';

  if (full) {
    // originalFor() is approved-only; moderation needs pending too, so read the
    // row directly here rather than loosening a function the public route uses.
    const rows = await dbOr([], () => sql`
      SELECT orig_key, wall_key, orig_type
        FROM wall_post
       WHERE id = ${id} AND deleted_at IS NULL`);
    const r = rows[0];
    if (r) {
      key = r.orig_key ?? r.wall_key;
      if (r.orig_key && r.orig_type) type = r.orig_type;
    }
  } else {
    key = await wallKeyFor(id, { approvedOnly: false });
  }
  if (!key) error(404);

  const bytes = await getObject(key);
  if (!bytes) error(404);

  return new Response(/** @type {BodyInit} */ (bytes), {
    headers: { 'content-type': type, 'cache-control': 'private, max-age=300' }
  });
}
